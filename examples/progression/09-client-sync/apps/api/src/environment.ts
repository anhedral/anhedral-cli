import type { CustomBindings, CustomVariables } from './custom-environment';
export type AppEnv = {
  Bindings: CustomBindings & {
    PUBLIC_APP_URL?: string;
    BETTER_AUTH_SECRET?: string;
    AUTH_TRUSTED_ORIGINS?: string;
    DATABASE_URL: string;
    FILES: R2Bucket;
    CLIENT_SYNC: DurableObjectNamespace;
    SYNC_API_ORIGIN?: string;
  };
  Variables: CustomVariables & { userId: string; fileKey: string };
};
