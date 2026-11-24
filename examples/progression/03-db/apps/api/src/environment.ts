import type { CustomBindings, CustomVariables } from './custom-environment';
export type AppEnv = {
  Bindings: CustomBindings & {
    DATABASE_URL: string;
  };
  Variables: CustomVariables & { userId: string; fileKey: string };
};
