import { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import type { BillingIdentity, BillingEntitlements } from '@workspace/contracts';
import { AuthConfiguration } from '@/components/auth-configuration';
import { Button } from '@/components/ui/button';
import { getAuthClient } from '@/lib/auth-client';
import { billingApi } from '@/lib/billing-api';
import { billingPlatform, checkoutKey, connectStore, disconnectStore, manageStorePurchases, openBillingURL, purchaseStoreOffer, restoreStorePurchases, storeOffers, type StoreOffer } from '@/lib/billing-platform';

export default function BillingRoute() { return <AuthConfiguration><Billing /></AuthConfiguration>; }
type Data = { identity: BillingIdentity; state: BillingEntitlements; offers: StoreOffer[] };
function billingError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'Billing is unavailable. Try again later.';
  if (message === 'API request failed (409).') return 'A checkout, subscription, or billing update already exists. Retry shortly, continue your checkout, or manage your current subscription.';
  return message;
}
function assertAccount(identity: BillingIdentity, userId: string, isCurrent: () => boolean) {
  if (!isCurrent()) throw new Error('The signed-in account changed.');
  if (identity.appUserId !== userId) throw new Error('The signed-in billing account changed.');
}
async function connectIdentity(identity: BillingIdentity, userId: string, isCurrent: () => boolean) {
  assertAccount(identity, userId, isCurrent);
  if (identity.providers.revenuecat) await connectStore(identity.appUserId);
  assertAccount(identity, userId, isCurrent);
}
async function loadBilling(userId: string, isCurrent: () => boolean): Promise<Data> {
  const identity = await billingApi.identity();
  await connectIdentity(identity, userId, isCurrent);
  const state = await billingApi.entitlements();
  const offers = identity.providers.revenuecat ? await storeOffers() : [];
  return { identity, state, offers };
}
function Billing() {
  const { data: session, isPending } = getAuthClient().useSession();
  const userId = session?.user.id;
  const [data, setData] = useState<Data | null>(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [reload, setReload] = useState(0);
  const attempts = useRef<Record<string, string>>({});
  const generation = useRef(0);
  const invalidate = useCallback(() => { ++generation.current; void disconnectStore(); }, []);
  useEffect(() => {
    const token = ++generation.current;
    if (userId) void loadBilling(userId, () => token === generation.current).then(
      (current) => { if (token === generation.current) setData(current); },
      (error) => { if (token === generation.current) setMessage(billingError(error)); },
    );
    return invalidate;
  }, [userId, reload, invalidate]);
  function updateCurrent(token: number, action: () => void) { if (token === generation.current) action(); }
  async function run(action: () => Promise<void>) {
    const token = generation.current;
    setPending(true); setMessage('');
    try {
      await action();
      const state = await billingApi.refresh();
      updateCurrent(token, () => setData((previous) => previous && { ...previous, state }));
    } catch (error) { updateCurrent(token, () => setMessage(billingError(error))); }
    finally { updateCurrent(token, () => setPending(false)); }
  }
  async function checkout(plan: string) {
    const key = attempts.current[plan] ??= checkoutKey();
    const result = await billingApi.checkout(plan, key);
    await openBillingURL(result.url);
  }
  if (isPending) return <Text>Restoring session…</Text>;
  if (!session) return <Redirect href="/sign-in" />;
  return <SessionBilling userId={session.user.id} data={data} message={message} pending={pending} run={run} checkout={checkout} retry={() => setReload((value) => value + 1)} />;
}
function SessionBilling({ userId, data, message, pending, run, checkout, retry }: Actions & { userId: string; data: Data | null; message: string; checkout: (plan: string) => Promise<void>; retry: () => void }) {
  if (data?.identity.appUserId !== userId) return <View style={{ padding: 24, gap: 12 }}><Text>{message || 'Loading subscriptions…'}</Text><Button onPress={retry}>Retry subscriptions</Button></View>;
  return <BillingContent data={data} message={message} pending={pending} run={run} checkout={checkout} />;
}
function Entitlements({ state }: { state: BillingEntitlements }) {
  return <View><Text accessibilityRole="header">Last server-verified access</Text>{state.entitlements.map((item) => <Text key={item.key}>{item.key}: {item.active ? 'Active' : 'Inactive'}</Text>)}<Text>Checked: {state.checkedAt}</Text></View>;
}
type Actions = { pending: boolean; run: (action: () => Promise<void>) => Promise<void> };
function WebPlans({ data, pending, run, checkout }: Actions & { data: Data; checkout: (plan: string) => Promise<void> }) {
  if (!data.identity.providers.stripe) return <Text>Web checkout is not configured for this product.</Text>;
  return <View style={{ gap: 12 }}>{data.identity.plans.map((plan) => <Button key={plan.id} disabled={pending} onPress={() => void run(() => checkout(plan.id))}>{plan.label}</Button>)}<Button disabled={pending} onPress={() => void run(async () => openBillingURL((await billingApi.portal()).url))}>Manage web subscription</Button></View>;
}
function NativePlans({ data, pending, run }: Actions & { data: Data }) {
  if (!data.identity.providers.revenuecat) return <Text>Native store purchases are not selected.</Text>;
  return <View style={{ gap: 12 }}>{data.offers.map((offer) => <Button key={offer.id} disabled={pending} onPress={() => void run(() => purchaseStoreOffer(offer.id))}>{offer.label + ' — ' + offer.price}</Button>)}<Button disabled={pending} onPress={() => void run(restoreStorePurchases)}>Restore purchases</Button><Button disabled={pending} onPress={() => void run(manageStorePurchases)}>Manage store subscription</Button></View>;
}
function BillingContent({ data, message, pending, run, checkout }: Actions & { data: Data; message: string; checkout: (plan: string) => Promise<void> }) {
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
    <Text accessibilityRole="header">Subscriptions</Text>
    <Entitlements state={data.state} />
    {billingPlatform === 'web' ? <WebPlans data={data} pending={pending} run={run} checkout={checkout} /> : <NativePlans data={data} pending={pending} run={run} />}
    <Button disabled={pending} onPress={() => void run(async () => undefined)}>Refresh server access</Button>
    <Text accessibilityLiveRegion="polite">{message}</Text>
    <Text>Purchases grant access only after server verification. Store account transfers follow the configured provider policy.</Text>
  </ScrollView>;
}
