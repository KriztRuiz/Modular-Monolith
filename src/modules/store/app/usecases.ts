import { z } from 'zod';
import type { Express } from 'express';
import { resolvePrice, type PriceType } from '../domain/types';
import type {
  StoreRepo, ProductRepo, InventoryRepo, CartRepo, OrderRepo, CommentRepo, StoreClaimRepo
} from './ports';
import { ProductModel } from '../infra/models';

// RBAC helper
export function assertOwnerOrAdmin(opts: { store: { ownerId?: string }; user?: Express.UserContext }) {
  if (!opts.user) throw new Error('UNAUTHORIZED');
  if (opts.user.role === 'admin') return;
  if (opts.store.ownerId && opts.store.ownerId === opts.user.id) return;
  throw new Error('FORBIDDEN');
}

// ===== STORES =====
export const CreateStoreInput = z.object({
  name: z.string().min(2),
  slug: z.string().min(2),
  type: z.enum(['OWNED', 'COMMUNITY']),
});

export class CreateStore {
  constructor(private stores: StoreRepo) {}
  async exec(input: z.infer<typeof CreateStoreInput>, user?: Express.UserContext, tenantId?: string) {
    const data = CreateStoreInput.parse(input);
    const store = await this.stores.create({
      name: data.name,
      slug: data.slug,
      type: data.type,
      ownerId: data.type === 'OWNED' ? user?.id : undefined,
      tenantId,
      verifiedBadge: data.type === 'OWNED',
      createdAt: new Date(),
    } as any);
    return store;
  }
}

// ===== PRODUCTS =====
export const CreateProductInput = z.object({
  storeId: z.string(),
  type: z.enum(['SIMPLE', 'BUNDLE']),
  title: z.string().min(2),
  slug: z.string().min(2),
  description: z.string().optional(),
  variants: z.array(z.object({
    sku: z.string().min(1),
    name: z.string().optional(),
    pricing: z.object({
      default: z.number().positive(),
      offer: z.number().positive().optional(),
      clearance: z.number().positive().optional(),
      activeType: z.enum(['DEFAULT', 'OFFER', 'CLEARANCE']).optional(),
      currency: z.string().default('MXN'),
    }),
    inventoryTracked: z.boolean().default(false),
    isAvailable: z.boolean().default(true),
    mainImage: z.string().url().optional(),
    images: z.array(z.string().url()).optional(),
  })).min(1),
  bundleItems: z.array(z.object({ sku: z.string(), qty: z.number().int().min(1) })).optional(),
  active: z.boolean().default(true),
});

export class CreateProduct {
  constructor(private products: ProductRepo, private stores: StoreRepo) {}
  async exec(raw: unknown, user?: Express.UserContext, tenantId?: string) {
    const input = CreateProductInput.parse(raw);
    const store = await this.stores.findById(input.storeId);
    if (!store) throw new Error('STORE_NOT_FOUND');

    // OWNED: solo dueño/admin; COMMUNITY: cualquier user autenticado
    if (store.type === 'OWNED') assertOwnerOrAdmin({ store, user });
    if (!user) throw new Error('UNAUTHORIZED');

    const created = await this.products.create({
      ...input,
      tenantId,
      createdAt: new Date(),
    } as any);
    return created;
  }
}

export class ListProductsByStore {
  constructor(private products: ProductRepo, private stores: StoreRepo) {}
  async exec(storeId: string, filters: { q?: string; active?: boolean; categoryId?: string }, tenantId?: string) {
    const store = await this.stores.findById(storeId);
    if (!store) throw new Error('STORE_NOT_FOUND');
    return this.products.listByStore(storeId, filters, tenantId);
  }
}

// ===== CART & CHECKOUT =====
// Soporta bundles: modo FIXED (por defecto), SUM y SUM_WITH_DISCOUNT
export const AddItemInput = z.object({
  sku: z.string(),
  qty: z.number().int().min(1),
  bundleMode: z.enum(['FIXED', 'SUM', 'SUM_WITH_DISCOUNT']).optional(),
  bundleDiscountPct: z.number().min(0).max(100).optional(), // solo si SUM_WITH_DISCOUNT
});

async function fetchVariantBySku(sku: string, tenantId?: string) {
  const filter: any = { 'variants.sku': sku };
  if (tenantId) filter.tenantId = tenantId;
  const product = await ProductModel.findOne(filter).lean();
  if (!product) return { product: null as any, variant: null as any };
  const variant = (product.variants as any[]).find((v) => v.sku === sku);
  return { product, variant };
}

async function sumBundleChildrenPrice(bundle: any, tenantId?: string) {
  let sum = 0;
  // bundle.bundleItems: [{ sku, qty }]
  for (const bi of bundle.bundleItems ?? []) {
    const { product: childProd, variant: childVar } = await fetchVariantBySku(bi.sku, tenantId);
    if (!childProd || !childVar) throw new Error('PRODUCT_NOT_FOUND'); // hijo inexistente
    const { price } = resolvePrice(childVar.pricing);
    sum += price * bi.qty;
  }
  return sum;
}

async function validateBundleChildrenStock(bundle: any, qtyBundleUnits: number, invRepo: InventoryRepo, tenantId?: string) {
  for (const bi of bundle.bundleItems ?? []) {
    const totalNeeded = bi.qty * qtyBundleUnits;
    // Para cada hijo, si trackea inventario entonces validar
    const { variant: childVar } = await fetchVariantBySku(bi.sku, tenantId);
    if (!childVar) throw new Error('PRODUCT_NOT_FOUND');

    if (childVar.inventoryTracked) {
      const inv = await invRepo.getBySku(bi.sku, tenantId);
      const available = (inv?.quantityOnHand || 0) - (inv?.reserved || 0);
      if (available < totalNeeded) throw new Error('INSUFFICIENT_STOCK');
    }
  }
}

async function deductBundleChildrenStock(bundle: any, qtyBundleUnits: number, invRepo: InventoryRepo, tenantId?: string) {
  for (const bi of bundle.bundleItems ?? []) {
    const totalNeeded = bi.qty * qtyBundleUnits;
    const inv = (await invRepo.getBySku(bi.sku, tenantId)) || { sku: bi.sku, quantityOnHand: 0, reserved: 0, tenantId };
    inv.quantityOnHand = Math.max(0, (inv.quantityOnHand || 0) - totalNeeded);
    await invRepo.upsert(inv);
  }
}

export class AddItemToCart {
  constructor(private cartRepo: CartRepo, private _productRepo: ProductRepo, private invRepo: InventoryRepo) {}
  async exec(userId: string, raw: unknown, tenantId?: string) {
    const input = AddItemInput.parse(raw);
    const cart = await this.cartRepo.getOrCreate(userId, tenantId);

    // Hallar la variante por SKU (consulta directa al modelo)
    const { product, variant } = await fetchVariantBySku(input.sku, tenantId);
    if (!product || !variant) throw new Error('PRODUCT_NOT_FOUND');

    // Validación de stock
    if (product.type === 'BUNDLE') {
      // Si el bundle trackea inventario a nivel bundle, validar eso;
      // si no, validar el stock de todos los hijos.
      if (variant.inventoryTracked) {
        const inv = await this.invRepo.getBySku(variant.sku, tenantId);
        const available = (inv?.quantityOnHand || 0) - (inv?.reserved || 0);
        if (available < input.qty) throw new Error('INSUFFICIENT_STOCK');
      } else {
        await validateBundleChildrenStock(product, input.qty, this.invRepo, tenantId);
      }
    } else {
      // SIMPLE
      if (variant.inventoryTracked) {
        const inv = await this.invRepo.getBySku(variant.sku, tenantId);
        const available = (inv?.quantityOnHand || 0) - (inv?.reserved || 0);
        if (available < input.qty) throw new Error('INSUFFICIENT_STOCK');
      }
    }

    // Calcular precio
    let price = 0;
    let priceType: PriceType = 'DEFAULT';
    let currency = variant.pricing?.currency ?? 'MXN';

    const bundleMode = input.bundleMode ?? 'FIXED';
    if (product.type === 'BUNDLE') {
      if (bundleMode === 'FIXED') {
        const resolved = resolvePrice(variant.pricing);
        price = resolved.price;
        priceType = resolved.priceType;
      } else if (bundleMode === 'SUM' || bundleMode === 'SUM_WITH_DISCOUNT') {
        const sum = await sumBundleChildrenPrice(product, tenantId);
        if (bundleMode === 'SUM_WITH_DISCOUNT') {
          const pct = Math.max(0, Math.min(100, input.bundleDiscountPct ?? 0)) / 100;
          price = Math.max(0, Math.round(sum * (1 - pct)));
        } else {
          price = sum;
        }
        priceType = 'DEFAULT';
      }
    } else {
      // SIMPLE
      const resolved = resolvePrice(variant.pricing);
      price = resolved.price;
      priceType = resolved.priceType;
    }

    // Agregar / acumular en carrito
    const existing = cart.items.find((it) => it.sku === input.sku);
    if (existing) {
      existing.qty += input.qty;
    } else {
      cart.items.push({
        sku: variant.sku,
        qty: input.qty,
        priceAtAdd: price,
        currency,
        productId: String(product._id),
        variantName: variant.name ?? undefined,  // null -> undefined
        titleSnapshot: product.title + (variant.name ? ` - ${variant.name}` : ''),
      });
    }

    await this.cartRepo.save(cart);
    return { cart, priceType } as { cart: import('../domain/types').Cart; priceType: PriceType };
  }
}

export class CheckoutCart {
  constructor(private cartRepo: CartRepo, private orderRepo: OrderRepo, private invRepo: InventoryRepo) {}
  async exec(userId: string, tenantId?: string) {
    const cart = await this.cartRepo.getOrCreate(userId, tenantId);
    if (!cart.items.length) throw new Error('CART_EMPTY');

    // Validación de stock (final) antes de descontar
    for (const it of cart.items) {
      const { product, variant } = await fetchVariantBySku(it.sku, tenantId);
      if (!product || !variant) throw new Error('PRODUCT_NOT_FOUND');

      if (product.type === 'BUNDLE') {
        if (variant.inventoryTracked) {
          const inv = await this.invRepo.getBySku(variant.sku, tenantId);
          const available = (inv?.quantityOnHand || 0) - (inv?.reserved || 0);
          if (available < it.qty) throw new Error('INSUFFICIENT_STOCK');
        } else {
          await validateBundleChildrenStock(product, it.qty, this.invRepo, tenantId);
        }
      } else {
        if (variant.inventoryTracked) {
          const inv = await this.invRepo.getBySku(it.sku, tenantId);
          const available = (inv?.quantityOnHand || 0) - (inv?.reserved || 0);
          if (available < it.qty) throw new Error('INSUFFICIENT_STOCK');
        }
      }
    }

    // Descuento de inventario
    for (const it of cart.items) {
      const { product, variant } = await fetchVariantBySku(it.sku, tenantId);
      if (!product || !variant) continue;

      if (product.type === 'BUNDLE') {
        if (variant.inventoryTracked) {
          const inv = (await this.invRepo.getBySku(it.sku, tenantId)) || { sku: it.sku, quantityOnHand: 0, reserved: 0, tenantId };
          inv.quantityOnHand = Math.max(0, (inv.quantityOnHand || 0) - it.qty);
          await this.invRepo.upsert(inv);
        } else {
          await deductBundleChildrenStock(product, it.qty, this.invRepo, tenantId);
        }
      } else {
        if (variant.inventoryTracked) {
          const inv = (await this.invRepo.getBySku(it.sku, tenantId)) || { sku: it.sku, quantityOnHand: 0, reserved: 0, tenantId };
          inv.quantityOnHand = Math.max(0, (inv.quantityOnHand || 0) - it.qty);
          await this.invRepo.upsert(inv);
        }
      }
    }

    const order = await this.orderRepo.create({
      userId,
      tenantId,
      items: cart.items.map((x) => ({
        sku: x.sku,
        qty: x.qty,
        price: x.priceAtAdd,
        currency: x.currency,
        titleSnapshot: x.titleSnapshot,
        variantName: x.variantName,
      })),
      status: 'PAID',
      paymentStatus: 'PAID',
    } as any);

    await this.cartRepo.clear(userId, tenantId);
    return order;
  }
}

// ===== INVENTORY =====
export const AdjustInventoryInput = z.object({ sku: z.string(), delta: z.number().int(), reason: z.string().optional() });
export class AdjustInventory {
  constructor(private invRepo: InventoryRepo) {}
  async exec(raw: unknown, tenantId?: string) {
    const { sku, delta } = AdjustInventoryInput.parse(raw);
    const inv = (await this.invRepo.getBySku(sku, tenantId)) || { sku, quantityOnHand: 0, reserved: 0, tenantId };
    inv.quantityOnHand = (inv.quantityOnHand || 0) + delta;
    return this.invRepo.upsert(inv);
  }
}

// ===== COMMENTS =====
export const CreateCommentInput = z.object({
  targetType: z.enum(['STORE', 'PRODUCT']),
  targetId: z.string(),
  content: z.string().min(1),
});
export class CreateComment {
  constructor(private repo: CommentRepo) {}
  async exec(userId: string, raw: unknown) {
    const input = CreateCommentInput.parse(raw);
    return this.repo.create({ ...input, userId, createdAt: new Date() } as any);
  }
}

export class DeleteComment {
  constructor(private repo: CommentRepo, private stores: StoreRepo, private products: ProductRepo) {}
  async exec(commentId: string, user?: Express.UserContext) {
    if (!user) throw new Error('UNAUTHORIZED');
    const c = await this.repo.findById(commentId);
    if (!c) return;

    if (user.role === 'admin') { await this.repo.delete(commentId); return; }

    if (c.targetType === 'STORE') {
      const store = await this.stores.findById(c.targetId);
      if (store?.ownerId === user.id) { await this.repo.delete(commentId); return; }
    } else {
      const prod = await this.products.findById(c.targetId);
      if (!prod) return;
      const store = await this.stores.findById(prod.storeId);
      if (store?.ownerId === user.id) { await this.repo.delete(commentId); return; }
    }
    throw new Error('FORBIDDEN');
  }
}

// ===== STORE CLAIMS =====
export const SubmitClaimInput = z.object({
  storeId: z.string(),
  evidenceDocs: z.array(z.string().url()).min(1),
});
export class SubmitStoreClaim {
  constructor(private repo: StoreClaimRepo) {}
  async exec(userId: string, raw: unknown) {
    const input = SubmitClaimInput.parse(raw);
    return this.repo.create({ storeId: input.storeId, userId, evidenceDocs: input.evidenceDocs, status: 'PENDING', createdAt: new Date() } as any);
  }
}

export const ReviewClaimInput = z.object({
  claimId: z.string(),
  decision: z.enum(['APPROVE', 'REJECT']),
});
export class ReviewStoreClaim {
  constructor(private repo: StoreClaimRepo, private stores: StoreRepo) {}
  async exec(raw: unknown) {
    const { claimId, decision } = ReviewClaimInput.parse(raw);
    const claim = await this.repo.findById(claimId);
    if (!claim) throw new Error('CLAIM_NOT_FOUND');

    if (decision === 'APPROVE') {
      await this.repo.update(claimId, { status: 'APPROVED' });
      await this.stores.update(claim.storeId, { ownerId: claim.userId, type: 'OWNED', verifiedBadge: true });
      return { ok: true } as const;
    } else {
      await this.repo.update(claimId, { status: 'REJECTED' });
      return { ok: true } as const;
    }
  }
}
