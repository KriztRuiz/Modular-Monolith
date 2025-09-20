import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import { connectMongo } from './core/db/mongo';
import { env } from './core/env';
import { log } from './core/logger';
import { modules } from './register-modules';
import errorHandler from './core/http/error-handler.js';
import { authOptional } from './core/http/jwt';
import { tenantContext } from './core/http/request-context';

export async function createApp() {
  await connectMongo();

  const app = express();
  app.use(helmet());
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json());
  app.use(authOptional);
  app.use(tenantContext);
  app.use(errorHandler);

  app.get('/health', (_req, res) => res.json({ ok: true }));

  for (const m of modules) {
    await m.init?.();
    m.routes?.(app);
    m.subscribers?.forEach((sub: () => void) => sub());
    log.info(`Module mounted: ${m.id}`);
  }

  app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));
  app.use(errorHandler);

  return app;
}
