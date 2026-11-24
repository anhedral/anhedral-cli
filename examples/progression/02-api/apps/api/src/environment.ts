import type { CustomBindings, CustomVariables } from './custom-environment';
export type AppEnv = {
  Bindings: CustomBindings;
  Variables: CustomVariables & { userId: string; fileKey: string };
};
