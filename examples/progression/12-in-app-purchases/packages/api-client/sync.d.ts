import type { ApiRequest } from './index.js';
export interface ChangeEvent {
  type: string;
  id?: string;
}
export declare function subscribe(
  request: ApiRequest,
  refresh: (event?: ChangeEvent) => void | Promise<void>,
  signal: AbortSignal,
  onForeground?: (wake: () => void) => () => void,
): Promise<void>;
