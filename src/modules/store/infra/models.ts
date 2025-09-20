import { Schema, model } from 'mongoose';

/** =======================
 *  Store
 *  - slug único por tenant (slug + tenantId)
 *  ======================= */
const StoreSchema = new Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true }, // el índice único se define abajo (compuesto)
    type: { type: String, enum: ['OWNED', 'COMMUNITY'], required: true },
    ownerId: { type: String },
    tenantId: { type: String },
    verifiedBadge: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

// ÚNICO por tenant (recomendado para multi-tenant)
StoreSchema.index({ slug: 1, tenantId: 1 }, { unique: true, name: 'uniq_store_slug_per_tenant' });

export const StoreModel = model('Store', StoreSchema);

/** =======================
 *  Pricing (embedded)
 *  ======================= */
const PricingSchema = new Schema(
  {
    default: { type: Number, required: true },
    offer: { type: Number },      // puede ser undefined/null según el uso
    clearance: { type: Number },  // puede ser undefined/null según el uso
    activeType: { type: String, enum: ['DEFAULT', 'OFFER', 'CLEARANCE'] },
    currency: { type: String, default: 'MXN' },
  },
  { _id: false }
);

/** =======================
 *  Variant (embedded)
 *  ======================= */
const VariantSchema = new Schema(
  {
    sku: { type: String, required: true },
    name: { type: String },
    pricing: { type: PricingSchema, required: true },
    inventoryTracked: { type: Boolean, default: false },
    isAvailable: { type: Boolean, default: true },
    mainImage: { type: String },
    images: { type: [String], default: [] },
  },
  { _id: false }
);

/** =======================
 *  BundleItem (embedded)
 *  ======================= */
const BundleItemSchema = new Schema(
  {
    sku: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

/** =======================
 *  Product
 *  - slug único por store (storeId + slug)
 *  ======================= */
const ProductSchema = new Schema(
  {
    storeId: { type: String, required: true, index: true },
    type: { type: String, enum: ['SIMPLE', 'BUNDLE'], required: true },
    title: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    description: { type: String },
    categoryIds: { type: [String], default: [] },
    variants: { type: [VariantSchema], required: true },
    bundleItems: { type: [BundleItemSchema], default: [] },
    active: { type: Boolean, default: true },
    tenantId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

// ÚNICO por store: evita colisión de slug dentro de la misma tienda
ProductSchema.index({ storeId: 1, slug: 1 }, { unique: true });

export const ProductModel = model('Product', ProductSchema);

/** =======================
 *  Inventory
 *  - sku único por tenant (sku + tenantId)
 *  ======================= */
const InventorySchema = new Schema(
  {
    sku: { type: String, required: true },
    quantityOnHand: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    tenantId: { type: String },
  },
  { timestamps: true }
);

// ÚNICO por tenant (para multi-tenant)
InventorySchema.index({ sku: 1, tenantId: 1 }, { unique: true, name: 'uniq_inventory_sku_per_tenant' });

export const InventoryModel = model('Inventory', InventorySchema);

/** =======================
 *  Cart
 *  ======================= */
const CartItemSchema = new Schema(
  {
    sku: String,
    qty: Number,
    priceAtAdd: Number,
    currency: String,
    productId: String,
    variantName: String,
    titleSnapshot: String,
  },
  { _id: false }
);

const CartSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    tenantId: { type: String },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const CartModel = model('Cart', CartSchema);

/** =======================
 *  Order
 *  ======================= */
const OrderItemSchema = new Schema(
  {
    sku: String,
    qty: Number,
    price: Number,
    currency: String,
    titleSnapshot: String,
    variantName: String,
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    tenantId: { type: String },
    items: { type: [OrderItemSchema], default: [] },
    status: { type: String, enum: ['PENDING', 'PAID', 'FULFILLING', 'COMPLETED', 'CANCELLED'], default: 'PENDING' },
    paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED'], default: 'PENDING' },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const OrderModel = model('Order', OrderSchema);

/** =======================
 *  Comment
 *  ======================= */
const CommentSchema = new Schema(
  {
    targetType: { type: String, enum: ['STORE', 'PRODUCT'], required: true },
    targetId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    content: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const CommentModel = model('Comment', CommentSchema);

/** =======================
 *  StoreClaim
 *  ======================= */
const StoreClaimSchema = new Schema(
  {
    storeId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    evidenceDocs: { type: [String], default: [] },
    status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

export const StoreClaimModel = model('StoreClaim', StoreClaimSchema);
