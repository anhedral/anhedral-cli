import { Hono } from 'hono';
import { requireSession } from '../security';
import { requireEntitlement } from '../entitlement-guard';
import type { AppEnv } from '../environment';
export const entitlementRoutes = new Hono<AppEnv>();
entitlementRoutes.get('/billing/access', requireSession, requireEntitlement, (c) =>
  c.json({ allowed: true }),
);
