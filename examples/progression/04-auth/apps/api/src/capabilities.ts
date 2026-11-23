// CLI-owned composition. Add custom routes in index.ts; edited composition is never overwritten.
import { Hono } from 'hono';
import type { AppEnv } from './environment';
import { authRoutes } from './features/auth';
export const capabilities = new Hono<AppEnv>();
capabilities.route('/', authRoutes);
