// CLI-owned composition. Add custom routes in index.ts; edited composition is never overwritten.
import { Hono } from 'hono';
import type { AppEnv } from './environment';
export const capabilities = new Hono<AppEnv>();
