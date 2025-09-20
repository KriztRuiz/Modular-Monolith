import { Router, type Express } from 'express';
import { Register, Login } from '../app/usecases';

export function registerAuthRoutes(app: Express) {
  const r = Router();

  // Registro
  r.post('/auth/register', async (req, res, next) => {
    try {
      const result = await new Register().exec(req.body);
      res.status(201).json(result);
    } catch (e) {
      next(e);
    }
  });

  // Login
  r.post('/auth/login', async (req, res, next) => {
    try {
      const result = await new Login().exec(req.body);
      res.json(result);
    } catch (e) {
      next(e);
    }
  });

  app.use(r);
}
