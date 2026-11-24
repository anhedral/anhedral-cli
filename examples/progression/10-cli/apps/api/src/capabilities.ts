// CLI-owned composition. Add custom routes in index.ts; edited composition is never overwritten.
import { Hono } from 'hono';
import type { AppEnv } from './environment';
import { authRoutes } from './features/auth';
import { storageRoutes } from './features/storage';
import { syncRoutes } from './features/client-sync';
import { clientOrigins } from './client-origins';
import { notifyFileChange } from './features/file-events';
export const capabilities = new Hono<AppEnv>();
capabilities.use('*', clientOrigins);
capabilities.use('/files/:name', notifyFileChange);
capabilities.route('/', authRoutes);
capabilities.route('/', storageRoutes);
capabilities.route('/', syncRoutes);
