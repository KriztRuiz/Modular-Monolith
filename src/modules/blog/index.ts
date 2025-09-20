import type { Express } from 'express';
import { di } from '../../core/di/container';
import { registerBlogRoutes } from './api/routes';
import { makeMongoPostRepo } from './infra/mongo-post-repo';
import { POST_REPO } from './app/ports';


export const blogModule = {
id: 'blog',
init() {
di.rebind(POST_REPO, makeMongoPostRepo());
},
routes(app: Express) {
registerBlogRoutes(app);
},
};