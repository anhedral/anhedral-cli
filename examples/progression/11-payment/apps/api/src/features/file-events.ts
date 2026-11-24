import type { MiddlewareHandler } from 'hono';
import type { AppEnv } from '../environment';
import { publishChange } from './client-sync';

export const notifyFileChange: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  if (!c.res.ok || !['PUT', 'DELETE'].includes(c.req.method)) return;
  // Storage committed. A disconnected device catches up on its next subscription.
  try {
    await publishChange(c.env, c.get('userId'), {
      type: c.req.method === 'PUT' ? 'file.stored' : 'file.deleted',
      id: c.req.param('name'),
    });
  } catch {
    console.warn('File change notification unavailable');
  }
};
