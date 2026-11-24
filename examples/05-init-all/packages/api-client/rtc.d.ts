import type { ApiRequest } from './index.js';
export declare function createRoom(request: ApiRequest, members?: string[]): Promise<string>;
export declare function joinToken(request: ApiRequest, roomId: string): Promise<string>;
