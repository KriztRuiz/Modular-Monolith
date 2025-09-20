import type { Request, Response, NextFunction } from 'express';

export function tenantContext(req: Request, _res: Response, next: NextFunction) {
  if (!req.tenantId) {
    const t = req.header('x-tenant-id');
    if (t) req.tenantId = t;
  }
  next();
}
