import type { ApiRequest } from './index.js';
export declare function file(
  request: ApiRequest,
  name: string,
  options?: RequestInit,
): Promise<Response>;
export declare function uploadFile(
  request: ApiRequest,
  name: string,
  body: BodyInit,
): Promise<Response>;
export declare function deleteFile(request: ApiRequest, name: string): Promise<Response>;
