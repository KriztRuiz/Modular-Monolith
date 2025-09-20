import type {
  Store, Product, InventoryRecord, Cart, Order, Comment, StoreClaim
} from '../domain/types';

export interface StoreRepo {
  create(input: Omit<Store, 'id' | 'createdAt' | 'verifiedBadge'> & { verifiedBadge?: boolean }): Promise<Store>;
  findById(id: string): Promise<Store | null>;
  findBySlug(slug: string, tenantId?: string): Promise<Store | null>;
  list(tenantId?: string): Promise<Store[]>;
  update(id: string, patch: Partial<Store>): Promise<Store | null>;
}

export interface ProductRepo {
  create(input: Omit<Product, 'id' | 'createdAt'>): Promise<Product>;
  update(id: string, patch: Partial<Product>): Promise<Product | null>;
  findById(id: string): Promise<Product | null>;
  findBySlug(slug: string, tenantId?: string): Promise<Product | null>;
  listByStore(
    storeId: string,
    filters?: { q?: string; active?: boolean; categoryId?: string },
    tenantId?: string
  ): Promise<Product[]>;
}

export interface InventoryRepo {
  getBySku(sku: string, tenantId?: string): Promise<InventoryRecord | null>;
  upsert(record: InventoryRecord): Promise<InventoryRecord>;
}

export interface CartRepo {
  getOrCreate(userId: string, tenantId?: string): Promise<Cart>;
  save(cart: Cart): Promise<Cart>;
  clear(userId: string, tenantId?: string): Promise<void>;
}

export interface OrderRepo {
  create(input: Omit<Order, 'id' | 'createdAt'>): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  listByUser(userId: string, tenantId?: string): Promise<Order[]>;
  update(id: string, patch: Partial<Order>): Promise<Order | null>;
}

export interface CommentRepo {
  create(input: Omit<Comment, 'id' | 'createdAt'>): Promise<Comment>;
  list(targetType: Comment['targetType'], targetId: string): Promise<Comment[]>;
  delete(id: string): Promise<void>;
  findById(id: string): Promise<Comment | null>;
}

export interface StoreClaimRepo {
  create(input: Omit<StoreClaim, 'id' | 'createdAt' | 'status'> & { status?: StoreClaim['status'] }): Promise<StoreClaim>;
  listByStore(storeId: string): Promise<StoreClaim[]>;
  findById(id: string): Promise<StoreClaim | null>;
  update(id: string, patch: Partial<StoreClaim>): Promise<StoreClaim | null>;
}

export const TOKENS = {
  STORE_REPO: 'STORE_REPO',
  PRODUCT_REPO: 'PRODUCT_REPO',
  INVENTORY_REPO: 'INVENTORY_REPO',
  CART_REPO: 'CART_REPO',
  ORDER_REPO: 'ORDER_REPO',
  COMMENT_REPO: 'COMMENT_REPO',
  STORE_CLAIM_REPO: 'STORE_CLAIM_REPO',
} as const;
