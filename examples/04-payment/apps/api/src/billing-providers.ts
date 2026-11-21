import type { AppEnv } from './environment';
import { stripeEntitled } from './features/stripe';

type EntitlementCheck = (env: AppEnv['Bindings'], userId: string) => Promise<boolean>;

export const billingProviders: Record<string, EntitlementCheck> = {
  stripe: stripeEntitled,
};
