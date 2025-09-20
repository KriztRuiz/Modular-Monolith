import type { Express } from 'express';
import { registerAuthRoutes } from './api/routes';


export const authModule = {
id: 'auth',
init() {},
routes(app: Express) {
registerAuthRoutes(app);
},
};