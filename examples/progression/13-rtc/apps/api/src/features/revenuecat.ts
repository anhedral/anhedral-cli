import type { AppEnv } from '../environment';
// Read the canonical provider entitlement each time paid access is checked.
export async function revenuecatEntitled(env: AppEnv['Bindings'], userId: string) {
  if (!env.REVENUECAT_SECRET_KEY || !env.REVENUECAT_ENTITLEMENT)
    throw Error('Configure RevenueCat');
  const response = await fetch(
    'https://api.revenuecat.com/v1/subscribers/' + encodeURIComponent(userId),
    {
      headers: { Authorization: 'Bearer ' + env.REVENUECAT_SECRET_KEY },
      redirect: 'error',
    },
  );
  if (!response.ok) throw Error('RevenueCat unavailable');
  const body = (await response.json()) as {
    subscriber: {
      entitlements: Record<
        string,
        { expires_date: string | null; grace_period_expires_date?: string | null }
      >;
    };
  };
  const item = body.subscriber.entitlements[env.REVENUECAT_ENTITLEMENT];
  return (
    !!item &&
    (item.expires_date === null ||
      Date.parse(item.expires_date) > Date.now() ||
      Date.parse(item.grace_period_expires_date ?? '') > Date.now())
  );
}
