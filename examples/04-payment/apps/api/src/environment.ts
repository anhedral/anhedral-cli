import type { CustomBindings, CustomVariables } from './custom-environment';
export type AppEnv = {
  Bindings: CustomBindings & {
    PUBLIC_APP_URL?: string;
    BETTER_AUTH_SECRET?: string;
    AUTH_TRUSTED_ORIGINS?: string;
    DATABASE_URL: string;
    FILES: R2Bucket;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    STRIPE_PRICE_ID?: string;
    BILLING_ENVIRONMENT?: string;
    BILLING_PROVIDER?: string;
  };
  Variables: CustomVariables & { userId: string; fileKey: string };
};
