import type { Request, Response, NextFunction } from 'express';
import { AppError } from './errors';

// Helper: detectar error de índice duplicado en Mongo
function isMongoDuplicate(err: any) {
  return Number(err?.code) === 11000 || (err?.name === 'MongoServerError' && Number(err?.code) === 11000);
}

const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as any;

  // Errores controlados de la app
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.code, message: err.message, details: err.details });
  }

  // Mongo: índice único (p. ej. slug duplicado, email repetido, etc.)
  if (isMongoDuplicate(e)) {
    return res.status(409).json({
      error: 'CONFLICT',
      message: 'Duplicate key',
      details: e?.keyValue ?? undefined,
    });
  }

  // Validación Zod
  if (e?.name === 'ZodError' && Array.isArray(e?.issues)) {
    return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'Invalid input', issues: e.issues });
  }

  // Mensajes de error “string” comunes que lanzamos en usecases
  const map: Record<string, number> = {
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    STORE_NOT_FOUND: 404,
    PRODUCT_NOT_FOUND: 404,
    INSUFFICIENT_STOCK: 422,
    CART_EMPTY: 422,
  };
  if (typeof e?.message === 'string' && map[e.message]) {
    return res.status(map[e.message]).json({ error: e.message, message: e.message });
  }

  // Fallback
  console.error(err);
  return res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Unexpected error' });
};

export default errorHandler;
