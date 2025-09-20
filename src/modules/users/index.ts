import type { Express } from 'express';
import { di } from '../../core/di/container';
import { makeMongoUserRepo } from './infra/mongo-user-repo';
import { registerUserRoutes } from './api/routes';
import { USER_REPO } from './app/ports';


export const usersModule = {
id: 'users',
init() {
di.rebind(USER_REPO, makeMongoUserRepo());
},
routes(app: Express) {
registerUserRoutes(app);
},
};