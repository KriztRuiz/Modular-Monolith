import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../env';
import { Unauthorized, Forbidden } from './errors';

export function authOptional(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return next();
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as Express.UserContext;
    req.user = payload;
    if (payload.tenantId) req.tenantId = payload.tenantId;
  } catch {}
  next();
}

export function authRequired(req: Request, _res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Unauthorized();
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as Express.UserContext;
    req.user = payload;
    if (payload.tenantId) req.tenantId = payload.tenantId;
    next();
  } catch {
    throw new Unauthorized();
  }
}

export function requireRole(role: 'admin' | 'user') {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) throw new Unauthorized();
    if (role === 'admin' && req.user.role !== 'admin') throw new Forbidden();
    next();
  };
}
