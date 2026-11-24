import { Hono } from 'hono';

import { requireEntitlement } from '../entitlement-guard';
import type { AppEnv } from '../environment';
import { requireSession } from '../security';

export const entitlementRoutes = new Hono<AppEnv>();
entitlementRoutes.get('/billing/access', requireSession, requireEntitlement, (c) =>
  c.json({ allowed: true }),
);
