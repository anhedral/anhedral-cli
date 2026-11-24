export type ApiRequest = (path: string, options?: RequestInit) => Promise<Response>;
export declare function createClient(
  origin: string,
  getToken?: () => string | undefined | Promise<string | undefined>,
): ApiRequest;
