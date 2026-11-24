import { cors } from 'hono/cors';
import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from './environment';
export const clientOrigins: MiddlewareHandler<AppEnv> = (c, next) => {
  const origins = (c.env.AUTH_TRUSTED_ORIGINS ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return cors({
    origin: (origin) => (origins.includes(origin) ? origin : null),
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key'],
    exposeHeaders: ['set-auth-token'],
    credentials: false,
  })(c, next);
};
