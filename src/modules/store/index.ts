import type { Express } from 'express';
import { di } from '../../core/di/container';
import { registerStoreRoutes } from './api/routes';
import {
  makeStoreRepo, makeProductRepo, makeInventoryRepo, makeCartRepo, makeOrderRepo, makeCommentRepo, makeStoreClaimRepo
} from './infra/repos';
import { TOKENS } from './app/ports';

export const storeModule = {
  id: 'store',
  init() {
    di.rebind(TOKENS.STORE_REPO, makeStoreRepo());
    di.rebind(TOKENS.PRODUCT_REPO, makeProductRepo());
    di.rebind(TOKENS.INVENTORY_REPO, makeInventoryRepo());
    di.rebind(TOKENS.CART_REPO, makeCartRepo());
    di.rebind(TOKENS.ORDER_REPO, makeOrderRepo());
    di.rebind(TOKENS.COMMENT_REPO, makeCommentRepo());
    di.rebind(TOKENS.STORE_CLAIM_REPO, makeStoreClaimRepo());
  },
  routes(app: Express) {
    registerStoreRoutes(app);
  },
};
