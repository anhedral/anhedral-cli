import { createBillingClient } from '@workspace/contracts';
import { nativeApiOrigin } from './api-client';
import { getAuthClient } from './auth-client.native';

function client() {
  return createBillingClient(nativeApiOrigin() + '/api/billing', {
    credentials: 'omit', headers: async () => {
      const headers = new Headers();
      headers.set('cookie', await getAuthClient().getCookie());
      return headers;
    },
  });
}
export const billingApi = {
  identity: () => client().identity(), entitlements: () => client().entitlements(),
  refresh: () => client().refresh(), checkout: (plan: string, key: string) => client().checkout(plan, key),
  portal: () => client().portal(),
};
