import { createApplicationApiClient } from './api-client';
import { getAuthClient } from './auth-client.native';

export const sessionApi = createApplicationApiClient({ headers: async () => {
  const cookie = await getAuthClient().getCookie();
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  return headers;
} });
