/**
 * The Express application.
 *
 * Split from the listener so tests can exercise the real routing stack (including
 * cookies, validation and error handling) without opening a port.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import express, { type Express } from 'express';
import { env, environmentProblems } from './config/env.ts';
import { getDb } from './db/index.ts';
import { attachAuth } from './http/context.ts';
import { apiNotFound, errorHandler } from './http/errorHandler.ts';
import { adminRouter } from './routes/adminRoutes.ts';
import { authRouter } from './routes/authRoutes.ts';
import { menuRouter } from './routes/menuRoutes.ts';
import { orderRouter } from './routes/orderRoutes.ts';
import { paymentRouter } from './routes/paymentRoutes.ts';
import { providerInfo } from './services/paymentService.ts';
import { count } from './db/index.ts';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '128kb' }));
  app.use(attachAuth);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      environment: env.nodeEnv,
      database: { driver: 'node:sqlite', file: env.dbFile, menuItems: count('SELECT COUNT(*) AS total FROM menu_items') },
      payment: providerInfo(),
      configurationProblems: environmentProblems().length,
    });
  });

  app.use('/api/menu', menuRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/orders', orderRouter);
  app.use('/api/payments', paymentRouter);
  app.use('/api/admin', adminRouter);

  app.use('/api', apiNotFound);
  app.use(errorHandler);

  // In production the same process serves the built single-page app, so the cafe is
  // one deployable unit and the API is same-origin (no CORS, no cookie surprises).
  const clientDir = join(process.cwd(), 'dist');
  if (existsSync(clientDir)) {
    app.use(express.static(clientDir, { index: false, maxAge: '1h' }));
    app.get(/^\/(?!api).*/, (_req, res) => {
      res.sendFile(join(clientDir, 'index.html'));
    });
  }

  return app;
}

/** Small helper used by the bootstrap to prove the database is reachable. */
export function assertDatabaseReachable(): void {
  getDb().prepare('SELECT 1 AS ok').get();
}
