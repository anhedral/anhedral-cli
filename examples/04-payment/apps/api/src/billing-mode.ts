import { z } from 'zod';
import type { AppEnv } from './environment';
const environment = z.enum(['sandbox', 'live']);
export function billingEnvironment(env: AppEnv['Bindings']) {
  return environment.parse(env.BILLING_ENVIRONMENT || 'sandbox');
}
// The CLI never sets live mode or credentials. Operators choose the environment
// explicitly, configure matching provider scope and validate it before rollout.
