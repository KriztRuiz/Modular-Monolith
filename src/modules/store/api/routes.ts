import { Router, type Express as ExpressApp } from 'express';
import { di } from '../../../core/di/container';
import { authRequired } from '../../../core/http/jwt';
import { TOKENS } from '../app/ports';
import { z } from 'zod';
import {
  CreateStore, CreateProduct, ListProductsByStore,
  AddItemToCart, CheckoutCart, AdjustInventory,
  CreateComment, DeleteComment,
  SubmitStoreClaim, ReviewStoreClaim
} from '../app/usecases';
import { StoreModel, ProductModel } from '../infra/models';

export function registerStoreRoutes(app: ExpressApp) {
  const r = Router();

  // =========================
  // Helpers (paginación / filtros)
  // =========================
  function parsePage(val: unknown, def = 1) {
    const n = Number(val);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : def;
  }
  function parsePageSize(val: unknown, def = 20, max = 100) {
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0) return def;
    return Math.min(Math.floor(n), max);
  }
  function parseBool(val: unknown) {
    if (val === 'true' || val === true) return true;
    if (val === 'false' || val === false) return false;
    return undefined;
  }
  function getTenantId(req: any): string | undefined {
    return (req.headers?.['x-tenant-id'] as string) || (req.tenantId as string) || undefined;
  }

  // =========================
  // CREATE / MUTATING ENDPOINTS
  // =========================

  // Crear tienda
  const createStoreSchema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    type: z.enum(['OWNED', 'FRANCHISE', 'OTHER']).optional(),
  });

  r.post('/store/stores', authRequired, async (req, res, next) => {
    try {
      const parsed = createStoreSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'INVALID_PAYLOAD', details: parsed.error.format() });
      const tenantId = getTenantId(req);
      const uc = new CreateStore(di.get(TOKENS.STORE_REPO));
      const store = await uc.exec(parsed.data as any, req.user, tenantId);
      res.status(201).json({ store });
    } catch (e) { next(e); }
  });

  // Crear producto
  r.post('/store/products', authRequired, async (req, res, next) => {
    try {
      const tenantId = getTenantId(req);
      const uc = new CreateProduct(di.get(TOKENS.PRODUCT_REPO), di.get(TOKENS.STORE_REPO));
      const product = await uc.exec(req.body, req.user, tenantId);
      res.status(201).json({ product });
    } catch (e) { next(e); }
  });

  // Listar productos por tienda (usecase existente - mantiene compatibilidad)
  r.get('/store/:storeId/products', async (req, res, next) => {
    try {
      const tenantId = getTenantId(req);
      const uc = new ListProductsByStore(di.get(TOKENS.PRODUCT_REPO), di.get(TOKENS.STORE_REPO));
      const list = await uc.exec(
        req.params.storeId,
        {
          q: req.query.q as string | undefined,
          active: req.query.active ? req.query.active === 'true' : undefined,
          categoryId: req.query.categoryId as string | undefined,
        },
        tenantId
      );
      res.json({ products: list });
    } catch (e) { next(e); }
  });

  // Carrito
  r.post('/store/cart/items', authRequired, async (req, res, next) => {
    try {
      const tenantId = getTenantId(req);
      const uc = new AddItemToCart(
        di.get(TOKENS.CART_REPO),
        di.get(TOKENS.PRODUCT_REPO),
        di.get(TOKENS.INVENTORY_REPO)
      );
      const result = await uc.exec(req.user!.id, req.body, tenantId);
      res.status(201).json(result);
    } catch (e) { next(e); }
  });

  // Checkout
  r.post('/store/checkout', authRequired, async (req, res, next) => {
    try {
      const tenantId = getTenantId(req);
      const uc = new CheckoutCart(
        di.get(TOKENS.CART_REPO),
        di.get(TOKENS.ORDER_REPO),
        di.get(TOKENS.INVENTORY_REPO)
      );
      const order = await uc.exec(req.user!.id, tenantId);
      res.status(201).json({ order });
    } catch (e) { next(e); }
  });

  // Ajuste inventario (proteger con owner/admin en tu middleware si lo deseas)
  r.post('/store/inventory/adjust', authRequired, async (req, res, next) => {
    try {
      const tenantId = getTenantId(req);
      const uc = new AdjustInventory(di.get(TOKENS.INVENTORY_REPO));
      const inv = await uc.exec(req.body, tenantId);
      res.status(201).json({ inventory: inv });
    } catch (e) { next(e); }
  });

  // Comentarios
  r.post('/store/comments', authRequired, async (req, res, next) => {
    try {
      const uc = new CreateComment(di.get(TOKENS.COMMENT_REPO));
      const c = await uc.exec(req.user!.id, req.body);
      res.status(201).json({ comment: c });
    } catch (e) { next(e); }
  });

  r.delete('/store/comments/:id', authRequired, async (req, res, next) => {
    try {
      const uc = new DeleteComment(
        di.get(TOKENS.COMMENT_REPO),
        di.get(TOKENS.STORE_REPO),
        di.get(TOKENS.PRODUCT_REPO)
      );
      await uc.exec(req.params.id, req.user);
      res.status(204).send();
    } catch (e) { next(e); }
  });

  // Claims de tienda
  r.post('/store/claims', authRequired, async (req, res, next) => {
    try {
      const uc = new SubmitStoreClaim(di.get(TOKENS.STORE_CLAIM_REPO));
      const claim = await uc.exec(req.user!.id, req.body);
      res.status(201).json({ claim });
    } catch (e) { next(e); }
  });

  r.post('/store/claims/:id/review', authRequired, async (req, res, next) => {
    try {
      if (req.user?.role !== 'admin') throw new Error('FORBIDDEN');
      const uc = new ReviewStoreClaim(di.get(TOKENS.STORE_CLAIM_REPO), di.get(TOKENS.STORE_REPO));
      const result = await uc.exec({ claimId: req.params.id, decision: req.body.decision });
      res.json(result);
    } catch (e) { next(e); }
  });

  // =========================
  // READ-ONLY ENDPOINTS (nuevos)
  // =========================

  /**
   * GET /store/stores
   * Query: q?, page?, pageSize?
   */
  const listStoresQuerySchema = z.object({ q: z.string().optional(), page: z.string().optional(), pageSize: z.string().optional() }).partial();

  r.get('/store/stores', async (req, res, next) => {
    try {
      const tenantId = getTenantId(req);
      const qParse = listStoresQuerySchema.safeParse(req.query);
      if (!qParse.success) return res.status(400).json({ error: 'INVALID_QUERY', details: qParse.error.format() });
      const { q } = qParse.data as { q?: string };
      const page = parsePage(req.query.page);
      const pageSize = parsePageSize(req.query.pageSize);

      const filter: any = {};
      if (tenantId) filter.tenantId = tenantId;
      if (q && q.trim()) {
        const rx = new RegExp(q.trim(), 'i');
        filter.$or = [{ name: rx }, { slug: rx }];
      }

      const [data, total] = await Promise.all([
        StoreModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
        StoreModel.countDocuments(filter),
      ]);

      res.json({
        data: data.map((s: any) => ({
          id: String(s._id),
          name: s.name,
          slug: s.slug,
          type: s.type,
          ownerId: s.ownerId ?? null,
          verifiedBadge: !!s.verifiedBadge,
          createdAt: s.createdAt,
        })),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      });
    } catch (e) { next(e); }
  });

  // GET /store/inventory/:sku  -> { sku, quantityOnHand, reserved, available, tenantId? }
    r.get('/store/inventory/:sku', async (req, res, next) => {
    try {
        const tenantId = (req.headers?.['x-tenant-id'] as string) || (req as any).tenantId || undefined;
        const { sku } = req.params;

        // Importamos aquí para evitar ciclos al tope del archivo si no lo tienes ya
        const { InventoryModel } = await import('../infra/models');

        const filter: any = { sku };
        if (tenantId) filter.tenantId = tenantId;

        const inv: any = await InventoryModel.findOne(filter).lean();
        const quantityOnHand = inv?.quantityOnHand ?? 0;
        const reserved = inv?.reserved ?? 0;
        const available = Math.max(0, quantityOnHand - reserved);

        res.json({
        sku,
        tenantId: inv?.tenantId ?? tenantId ?? null,
        quantityOnHand,
        reserved,
        available,
        exists: !!inv,
        updatedAt: inv?.updatedAt ?? null,
        createdAt: inv?.createdAt ?? null,
        });
    } catch (e) { next(e); }
    });

  /**
   * GET /store/stores/:storeId/products
   * Query: q?, active?, categoryId?, page?, pageSize?
   * (Se mantiene también /store/:storeId/products legado arriba)
   */
  r.get('/store/stores/:storeId/products', async (req, res, next) => {
    try {
      const tenantId = getTenantId(req);
      const { storeId } = req.params;
      const querySchema = z.object({ q: z.string().optional(), categoryId: z.string().optional(), active: z.string().optional(), page: z.string().optional(), pageSize: z.string().optional() }).partial();
      const qParse = querySchema.safeParse(req.query);
      if (!qParse.success) return res.status(400).json({ error: 'INVALID_QUERY', details: qParse.error.format() });
      const { q, categoryId } = qParse.data as { q?: string; categoryId?: string };
      const active = parseBool(qParse.data.active);
       const page = parsePage(req.query.page);
       const pageSize = parsePageSize(req.query.pageSize);

      const filter: any = { storeId };
      if (tenantId) filter.tenantId = tenantId;
      if (typeof active === 'boolean') filter.active = active;
      if (categoryId) filter.categoryIds = categoryId;
      if (q && q.trim()) {
        const rx = new RegExp(q.trim(), 'i');
        filter.$or = [{ title: rx }, { slug: rx }];
      }

      const [data, total] = await Promise.all([
        ProductModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
        ProductModel.countDocuments(filter),
      ]);

      res.json({
        data: data.map((p: any) => ({
          id: String(p._id),
          storeId: p.storeId,
          type: p.type,
          title: p.title,
          slug: p.slug,
          active: !!p.active,
          createdAt: p.createdAt,
          variantsCount: Array.isArray(p.variants) ? p.variants.length : 0,
        })),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      });
    } catch (e) { next(e); }
  });

  /**
   * GET /store/products/:productId
   * Detalle de producto (con variantes)
   */
  r.get('/store/products/:productId', async (req, res, next) => {
    try {
      const tenantId = getTenantId(req);
      const { productId } = req.params;

      const filter: any = { _id: productId };
      if (tenantId) filter.tenantId = tenantId;

      const p: any = await ProductModel.findOne(filter).lean();
      if (!p) return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found' });

      res.json({
        id: String(p._id),
        storeId: p.storeId,
        type: p.type,
        title: p.title,
        slug: p.slug,
        description: p.description ?? '',
        categoryIds: p.categoryIds ?? [],
        active: !!p.active,
        createdAt: p.createdAt,
        variants: (p.variants ?? []).map((v: any) => ({
          sku: v.sku,
          name: v.name ?? undefined,
          pricing: {
            default: v?.pricing?.default,
            offer: v?.pricing?.offer ?? null,
            clearance: v?.pricing?.clearance ?? null,
            activeType: v?.pricing?.activeType ?? null,
            currency: v?.pricing?.currency ?? 'MXN',
          },
          inventoryTracked: !!v.inventoryTracked,
          isAvailable: !!v.isAvailable,
          mainImage: v.mainImage ?? null,
          images: Array.isArray(v.images) ? v.images : [],
        })),
        bundleItems: p.bundleItems ?? [],
      });
    } catch (e) { next(e); }
  });

  app.use(r);
}
