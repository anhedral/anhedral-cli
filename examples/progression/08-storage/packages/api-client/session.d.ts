import type { ApiRequest } from './index.js';
export declare function signIn(
  request: ApiRequest,
  email: string,
  password: string,
  saveToken: (token: string) => unknown,
): Promise<void>;
export declare function signOut(request: ApiRequest, clearToken: () => unknown): Promise<void>;
export declare function currentUser(request: ApiRequest): Promise<string | null>;
