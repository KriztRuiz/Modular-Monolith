import type {
  StoreRepo, ProductRepo, InventoryRepo, CartRepo, OrderRepo, CommentRepo, StoreClaimRepo
} from '../app/ports';
import type {
  Store, Product, InventoryRecord, Cart, Order, Comment, StoreClaim
} from '../domain/types';
import {
  StoreModel, ProductModel, InventoryModel, CartModel, OrderModel, CommentModel, StoreClaimModel
} from './models';

export function makeStoreRepo(): StoreRepo {
  return {
    async create(input) {
      const doc = await StoreModel.create(input as any);
      return mapStore(doc.toObject());
    },
    async findById(id) {
  const d = await StoreModel.findById(String(id)).lean();
      return d ? mapStore(d) : null;
    },
    async findBySlug(slug, tenantId) {
  const q: any = { slug: String(slug) };
  if (tenantId) q.tenantId = String(tenantId);
      const d = await StoreModel.findOne(q).lean();
      return d ? mapStore(d) : null;
    },
    async list(tenantId) {
  const q: any = {};
  if (tenantId) q.tenantId = String(tenantId);
      const ds = await StoreModel.find(q).lean();
      return ds.map(mapStore);
    },
    async update(id, patch) {
  const d = await StoreModel.findByIdAndUpdate(String(id), patch, { new: true }).lean();
      return d ? mapStore(d) : null;
    },
  };
}

export function makeProductRepo(): ProductRepo {
  return {
    async create(input) {
      const doc = await ProductModel.create(input as any);
      return mapProduct(doc.toObject());
    },
    async update(id, patch) {
      const d = await ProductModel.findByIdAndUpdate(id, patch, { new: true }).lean();
      return d ? mapProduct(d) : null;
    },
    async findById(id) {
      const d = await ProductModel.findById(id).lean();
      return d ? mapProduct(d) : null;
    },
    async findBySlug(slug, tenantId) {
      const q: any = { slug };
      if (tenantId) q.tenantId = tenantId;
      const d = await ProductModel.findOne(q).lean();
      return d ? mapProduct(d) : null;
    },
    async listByStore(storeId, filters, tenantId) {
      const q: any = { storeId: String(storeId) };
      if (tenantId) q.tenantId = String(tenantId);
      if (filters?.active !== undefined) q.active = filters.active;
      if (filters?.categoryId) q.categoryIds = filters.categoryId;
      // sanitize filters.q: only allow primitive strings for search
      if (filters?.q !== undefined) {
        const qRaw = filters.q;
        const qStr = typeof qRaw === 'string' ? qRaw : String(qRaw);
        const trimmed = qStr.trim();
        if (trimmed.length > 0) {
          // avoid using $text (requires text index). Use safe RegExp searches on common fields instead.
          // escape regex special chars
          const esc = (s: string) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&');
          const re = new RegExp(esc(trimmed), 'i');
          q.$or = [
            { title: re },
            { description: re },
          ];
        }
      }
      const ds = await ProductModel.find(q).lean();
      return ds.map(mapProduct);
    },
  };
}

export function makeInventoryRepo(): InventoryRepo {
  return {
    async getBySku(sku, tenantId) {
  const q: any = { sku: String(sku) };
  if (tenantId) q.tenantId = String(tenantId);
      const d = await InventoryModel.findOne(q).lean();
      return d ? mapInv(d) : null;
    },
    async upsert(record) {
      const d = await InventoryModel.findOneAndUpdate(
  { sku: String(record.sku) },
  record,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();
      return mapInv(d!);
    },
  };
}

export function makeCartRepo(): CartRepo {
  return {
    async getOrCreate(userId, tenantId) {
  const q: any = { userId: String(userId) };
  if (tenantId) q.tenantId = String(tenantId);
      let d = await CartModel.findOne(q).lean();
      if (!d) d = (await CartModel.create({ userId, tenantId, items: [] })).toObject();
      return mapCart(d);
    },
    async save(cart) {
  await CartModel.updateOne({ _id: String(cart.id) }, { $set: { items: cart.items } }, { upsert: true });
      return cart;
    },
    async clear(userId, tenantId) {
  const q: any = { userId: String(userId) };
  if (tenantId) q.tenantId = String(tenantId);
  await CartModel.updateOne(q, { $set: { items: [] } });
    },
  };
}

export function makeOrderRepo(): OrderRepo {
  return {
    async create(input) {
      const d = await OrderModel.create(input as any);
      return mapOrder(d.toObject());
    },
    async findById(id) {
      const d = await OrderModel.findById(id).lean();
      return d ? mapOrder(d) : null;
    },
    async listByUser(userId, tenantId) {
      const q: any = { userId };
      if (tenantId) q.tenantId = tenantId;
      const ds = await OrderModel.find(q).lean();
      return ds.map(mapOrder);
    },
    async update(id, patch) {
      const d = await OrderModel.findByIdAndUpdate(id, patch, { new: true }).lean();
      return d ? mapOrder(d) : null;
    },
  };
}

export function makeCommentRepo(): CommentRepo {
  return {
    async create(input) {
      const d = await CommentModel.create(input as any);
      return mapComment(d.toObject());
    },
    async list(targetType, targetId) {
      const ds = await CommentModel.find({ targetType, targetId }).lean();
      return ds.map(mapComment);
    },
    async delete(id) {
      await CommentModel.findByIdAndDelete(id);
    },
    async findById(id) {
      const d = await CommentModel.findById(id).lean();
      return d ? mapComment(d) : null;
    },
  };
}

export function makeStoreClaimRepo(): StoreClaimRepo {
  return {
    async create(input) {
      const d = await StoreClaimModel.create(input as any);
      return mapClaim(d.toObject());
    },
    async listByStore(storeId) {
      const ds = await StoreClaimModel.find({ storeId }).lean();
      return ds.map(mapClaim);
    },
    async findById(id) {
      const d = await StoreClaimModel.findById(id).lean();
      return d ? mapClaim(d) : null;
    },
    async update(id, patch) {
      const d = await StoreClaimModel.findByIdAndUpdate(id, patch, { new: true }).lean();
      return d ? mapClaim(d) : null;
    },
  };
}

// mapeadores
function mapStore(d: any): Store {
  return { id: String(d._id), name: d.name, slug: d.slug, type: d.type, ownerId: d.ownerId, tenantId: d.tenantId, verifiedBadge: !!d.verifiedBadge, createdAt: d.createdAt };
}
function mapProduct(d: any): Product {
  return { id: String(d._id), storeId: d.storeId, type: d.type, title: d.title, slug: d.slug, description: d.description, categoryIds: d.categoryIds, variants: d.variants, bundleItems: d.bundleItems, active: d.active, tenantId: d.tenantId, createdAt: d.createdAt };
}
function mapInv(d: any): InventoryRecord {
  return { sku: d.sku, quantityOnHand: d.quantityOnHand, reserved: d.reserved, tenantId: d.tenantId };
}
function mapCart(d: any): Cart {
  return { id: String(d._id), userId: d.userId, tenantId: d.tenantId, items: d.items, createdAt: d.createdAt };
}
function mapOrder(d: any): Order {
  return { id: String(d._id), userId: d.userId, tenantId: d.tenantId, items: d.items, status: d.status, paymentStatus: d.paymentStatus, createdAt: d.createdAt };
}
function mapComment(d: any): Comment {
  return { id: String(d._id), targetType: d.targetType, targetId: d.targetId, userId: d.userId, content: d.content, createdAt: d.createdAt };
}
function mapClaim(d: any): StoreClaim {
  return { id: String(d._id), storeId: d.storeId, userId: d.userId, evidenceDocs: d.evidenceDocs, status: d.status, createdAt: d.createdAt };
}
