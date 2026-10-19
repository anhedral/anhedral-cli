import { Platform } from 'react-native';
import { createApiClient } from '@workspace/contracts';

type Options = NonNullable<Parameters<typeof createApiClient>[1]>;

function validProtocol(url: URL): boolean {
  return url.protocol === 'https:' || (__DEV__ && url.protocol === 'http:');
}
export function nativeApiOrigin(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (!configured) throw new Error('Configure EXPO_PUBLIC_API_URL with the product origin reachable from this device.');
  const origin = new URL(configured);
  if (!validProtocol(origin)) throw new Error('EXPO_PUBLIC_API_URL requires HTTPS outside development.');
  if ([origin.username, origin.password, origin.pathname !== '/', origin.search, origin.hash].some(Boolean))
    throw new Error('EXPO_PUBLIC_API_URL must be an origin without credentials, path, query or fragment.');
  return origin.origin;
}
function apiBaseURL(): string {
  if (Platform.OS === 'web') return '/api';
  return nativeApiOrigin() + '/api';
}

// A native auth adapter can provide its own session headers. No server secret belongs here.
export function createApplicationApiClient(options: Options = {}) {
  const client = () => createApiClient(apiBaseURL(), {
    ...options, credentials: Platform.OS === 'web' ? 'same-origin' : 'omit',
  });
  return {
    health: (init?: RequestInit) => client().health(init),
    session: (init?: RequestInit) => client().session(init),
  };
}

export const api = createApplicationApiClient();
