import { subscribe } from '@workspace/api-client/sync';
import { apiClient } from './api.js';

export function subscribeToChanges(refresh, signal, getToken) {
  return subscribe(apiClient(undefined, getToken), refresh, signal);
}
