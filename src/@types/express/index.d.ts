import 'express';

declare global {
    namespace Express {
        interface UserContext {
            id: string;
            role: 'user' | 'admin';
            tenantId?: string;
        }
        interface Request {
            user?: UserContext;
            tenantId?: string;
        }
    }
}
export {};