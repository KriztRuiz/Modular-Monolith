export type StoreType = 'OWNED' | 'COMMUNITY';

export interface Store {
  id: string;
  name: string;
  slug: string;
  type: StoreType;       // OWNED => ownerId obligatorio; COMMUNITY => ownerId ausente
  ownerId?: string;
  tenantId?: string;
  verifiedBadge: boolean;
  createdAt: Date;
}

export type PriceType = 'DEFAULT' | 'OFFER' | 'CLEARANCE';

export interface Pricing {
  default: number;
  // En lecturas de Mongoose estos opcionales pueden venir como null:
  offer?: number | null;
  clearance?: number | null;
  activeType?: PriceType | null;  // si no se define, se toma DEFAULT
  currency: string;               // p.ej. "MXN"
}

export type ProductType = 'SIMPLE' | 'BUNDLE';

export interface ProductVariant {
  sku: string;
  name?: string | null;
  pricing: Pricing;
  inventoryTracked: boolean;   // inventario opcional por variante
  isAvailable: boolean;
  mainImage?: string | null;
  images?: string[] | null;
}

export interface BundleItem {
  sku: string;
  qty: number;
}

export interface Product {
  id: string;
  storeId: string;
  type: ProductType;
  title: string;
  slug: string;
  description?: string;
  categoryIds?: string[];
  variants: ProductVariant[];
  bundleItems?: BundleItem[];  // solo si type = BUNDLE
  active: boolean;
  tenantId?: string;
  createdAt: Date;
}

export interface InventoryRecord {
  sku: string;
  quantityOnHand: number;
  reserved: number;
  tenantId?: string;
}

export interface CartItem {
  sku: string;
  qty: number;
  priceAtAdd: number;
  currency: string;
  productId: string;
  variantName?: string;
  titleSnapshot: string;
}

export interface Cart {
  id: string;
  userId: string;
  tenantId?: string;
  items: CartItem[];
  createdAt: Date;
}

export type OrderStatus = 'PENDING' | 'PAID' | 'FULFILLING' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface OrderItem {
  sku: string;
  qty: number;
  price: number;
  currency: string;
  titleSnapshot: string;
  variantName?: string;
}

export interface Order {
  id: string;
  userId: string;
  tenantId?: string;
  items: OrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: Date;
}

export type CommentTargetType = 'STORE' | 'PRODUCT';

export interface Comment {
  id: string;
  targetType: CommentTargetType;
  targetId: string; // storeId o productId
  userId: string;
  content: string;
  createdAt: Date;
}

export type StoreClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface StoreClaim {
  id: string;
  storeId: string;
  userId: string;
  evidenceDocs: string[];   // URLs/paths de documentos (INE, comprobantes)
  status: StoreClaimStatus;
  createdAt: Date;
}

export function resolvePrice(pr: Pricing): { price: number; priceType: PriceType } {
  const t = pr.activeType ?? 'DEFAULT';
  // != null cubre null y undefined
  if (t === 'OFFER' && pr.offer != null)       return { price: pr.offer as number,     priceType: 'OFFER' };
  if (t === 'CLEARANCE' && pr.clearance != null) return { price: pr.clearance as number, priceType: 'CLEARANCE' };
  return { price: pr.default, priceType: 'DEFAULT' };
}
