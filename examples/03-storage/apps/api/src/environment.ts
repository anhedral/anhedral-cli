import type { CustomBindings, CustomVariables } from './custom-environment';
export type AppEnv = { Bindings: CustomBindings & {PUBLIC_APP_URL?: string;
BETTER_AUTH_SECRET?: string;
AUTH_TRUSTED_ORIGINS?: string;
DB: D1Database;
FILES: R2Bucket}; Variables: CustomVariables & {userId:string;fileKey:string} };
