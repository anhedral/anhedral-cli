import { type MiddlewareHandler } from 'hono';
import { z } from 'zod';
import { billingProviders } from './billing-providers';
import type { AppEnv } from './environment';
const policy = z.enum(['stripe', 'revenuecat', 'either']);
function selectedProviders(env: AppEnv['Bindings']) {
  const selected = policy.parse(env.BILLING_PROVIDER);
  return selected === 'either' ? Object.keys(billingProviders) : [selected];
}
async function providerEntitlement(name: string, env: AppEnv['Bindings'], subject: string) {
  const resolve = billingProviders[name];
  if (!resolve) throw Error('Selected billing provider is not installed');
  return resolve(env, subject);
}
async function entitled(env: AppEnv['Bindings'], subject: string) {
  const checks = await Promise.all(
    selectedProviders(env).map((name) => providerEntitlement(name, env, subject).catch(() => null)),
  );
  if (checks.includes(true)) return true;
  if (checks.includes(null)) throw Error('Billing provider unavailable');
  return false;
}
export const requireEntitlement: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.get('userId')) return c.json({ error: 'Unauthorized' }, 401);
  try {
    if (!(await entitled(c.env, c.get('userId'))))
      return c.json({ error: 'Subscription required' }, 403);
  } catch {
    return c.json({ error: 'Billing needs configuration or is temporarily unavailable' }, 503);
  }
  await next();
};
