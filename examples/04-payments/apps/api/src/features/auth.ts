import { Hono } from 'hono';
import { createAuth, authConfiguration } from '../auth';
import { requireSession } from '../security';
import type { AppEnv } from '../environment';
export const authRoutes = new Hono<AppEnv>();
authRoutes.on(['GET', 'POST'], '/auth/*', (c) => {
  if (!authConfiguration.safeParse(c.env).success)
    return c.json({ error: 'Authentication needs configuration' }, 503);
  return createAuth(c.env).handler(c.req.raw);
});
authRoutes.get('/session', requireSession, (c) => c.json({ userId: c.get('userId') }));
