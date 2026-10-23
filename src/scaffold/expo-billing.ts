import { expoUiSource } from './anhedral-ui.js';
import { writeEnvironmentFile } from './environment.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { STACK_DEPENDENCIES } from '../dependencies.js';
import type { RecipeContext } from '../registry/types.js';
import { patchPackage, put as writeSource } from './files.js';

/** Native store purchases and web Stripe checkout share only server-verified entitlements. */
export function scaffoldExpoBilling({ root, has }: RecipeContext): void {
  if (!has('expo')) return;
  const directory = 'apps/mobile';
  if (!has('better-auth')) {
    put(
      root,
      `${directory}/billing-integration.md`,
      '# Native billing integration\n\nThe selected Clerk identity needs its native session adapter before using the authenticated billing APIs. Supply verified session headers to createBillingClient from @workspace/contracts. Do not use a client-selected account ID to authorize access.\n',
    );
    return;
  }
  if (has('revenuecat')) {
    writeEnvironmentFile(root, `${directory}/.env.example`, {
      EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: '',
      EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY: '',
    });
    patchPackage(root, `${directory}/package.json`, {
      dependencies: { 'react-native-purchases': STACK_DEPENDENCIES['react-native-purchases'] },
    });
  }
  put(
    root,
    `${directory}/lib/billing-api.ts`,
    `import { createBillingClient } from '@workspace/contracts';
export const billingApi = createBillingClient();
`,
  );
  put(
    root,
    `${directory}/lib/billing-api.native.ts`,
    `import { createBillingClient } from '@workspace/contracts';
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
`,
  );
  put(
    root,
    `${directory}/lib/billing-platform.ts`,
    `export interface StoreOffer { id: string; label: string; price: string }
export const billingPlatform = 'web';
export async function connectStore(_userId: string): Promise<void> {}
export async function disconnectStore(): Promise<void> {}
export async function storeOffers(): Promise<StoreOffer[]> { return []; }
export async function purchaseStoreOffer(_id: string): Promise<void> { throw new Error('Native store purchases require a device build.'); }
export async function restoreStorePurchases(): Promise<void> { throw new Error('Restore purchases in the native app.'); }
export async function manageStorePurchases(): Promise<void> { throw new Error('Native store management requires a device build.'); }
export function checkoutKey(): string { return crypto.randomUUID(); }
export async function openBillingURL(value: string): Promise<void> {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('Billing navigation requires HTTPS.');
  if (!['checkout.stripe.com', 'billing.stripe.com'].includes(url.hostname)) throw new Error('Unrecognized Stripe destination.');
  globalThis.location.assign(url.href);
}
`,
  );
  if (has('revenuecat'))
    put(root, `${directory}/lib/billing-platform.native.ts`, nativeStoreSource());
  else
    put(
      root,
      `${directory}/lib/billing-platform.native.ts`,
      `export type { StoreOffer } from './billing-platform';
export const billingPlatform = 'native';
export async function connectStore(_userId: string): Promise<void> {}
export async function disconnectStore(): Promise<void> {}
export async function storeOffers(): Promise<import('./billing-platform').StoreOffer[]> { return []; }
export async function purchaseStoreOffer(_id: string): Promise<void> { throw new Error('RevenueCat is not selected.'); }
export async function restoreStorePurchases(): Promise<void> { throw new Error('RevenueCat is not selected.'); }
export async function manageStorePurchases(): Promise<void> { throw new Error('RevenueCat is not selected.'); }
export function checkoutKey(): string { throw new Error('Stripe checkout is web-only.'); }
export async function openBillingURL(_url: string): Promise<void> { throw new Error('Stripe checkout is web-only.'); }
`,
    );
  put(root, `${directory}/app/billing.tsx`, billingScreenSource());
  const account = `${directory}/app/account.tsx`;
  const source = readFileSync(path.join(root, account), 'utf8');
  const linked = source.includes('href="/billing"')
    ? source
    : source.replace(
        '<Link href="/">Home</Link>',
        '<Link href="/billing">Subscription and entitlements</Link>\n    <Link href="/">Home</Link>',
      );
  if (linked.includes('await disconnectStore();')) return;
  put(
    root,
    account,
    "import { disconnectStore } from '@/lib/billing-platform';\n" +
      linked.replace(
        'const result = await getAuthClient().signOut();',
        'await disconnectStore();\n      const result = await getAuthClient().signOut();',
      ),
  );
}

function nativeStoreSource(): string {
  return `import Purchases from 'react-native-purchases';
import { Linking, Platform } from 'react-native';
import type { StoreOffer } from './billing-platform';
export const billingPlatform = 'native';
let generation = 0;
let account: string | null = null;
let queue: Promise<void> = Promise.resolve();

function serial<T>(action: () => Promise<T>): Promise<T> {
  const next = queue.then(action, action);
  queue = next.then(() => undefined, () => undefined);
  return next;
}
function platformKey(): string {
  const keys: Partial<Record<string, string>> = {
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
  };
  return keys[Platform.OS] ?? '';
}
function assertIdentity(token: number): void {
  if (token !== generation) throw new Error('The signed-in account changed. Refresh subscriptions.');
  if (!account) throw new Error('Sign in before using purchases.');
}
async function assertStoreIdentity(token: number): Promise<void> {
  assertIdentity(token);
  if (await Purchases.getAppUserID() !== account) throw new Error('The store account differs from the verified application account.');
  assertIdentity(token);
}
export async function connectStore(userId: string): Promise<void> {
  const token = ++generation;
  account = null;
  await serial(async () => {
    await configureIdentity(userId);
    if (token === generation) account = userId;
  });
}
async function configureIdentity(userId: string): Promise<void> {
  const apiKey = platformKey();
  if (!apiKey) throw new Error('Configure the platform public RevenueCat SDK key and rebuild the native app.');
  if (await Purchases.isConfigured()) await Purchases.logIn(userId);
  else Purchases.configure({ apiKey, appUserID: userId });
  await verifyConfiguredIdentity(userId);
}
async function verifyConfiguredIdentity(userId: string): Promise<void> {
  if (await Purchases.getAppUserID() !== userId) throw new Error('Store identity synchronization failed.');
}
export async function disconnectStore(): Promise<void> {
  ++generation; account = null;
  const operation = serial(async () => {
    if (!(await Purchases.isConfigured())) return;
    if (!(await Purchases.isAnonymous())) await Purchases.logOut();
  });
  await bestEffortLogout(operation);
}
async function bestEffortLogout(operation: Promise<void>): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([operation.catch(() => undefined), new Promise<void>((resolve) => { timer = setTimeout(resolve, 5000); })]);
  } finally { clearTimeout(timer); }
}
async function availablePackages() {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}
export async function storeOffers(): Promise<StoreOffer[]> {
  const token = generation;
  return serial(async () => {
    await assertStoreIdentity(token);
    const items = await availablePackages();
    await assertStoreIdentity(token);
    return items.map((item) => ({ id: item.identifier, label: item.product.title, price: item.product.priceString }));
  });
}
export async function purchaseStoreOffer(id: string): Promise<void> {
  const token = generation;
  await serial(async () => {
    await assertStoreIdentity(token);
    const item = (await availablePackages()).find((entry) => entry.identifier === id);
    if (!item) throw new Error('This offering is no longer available. Refresh subscriptions.');
    await assertStoreIdentity(token);
    await Purchases.purchasePackage(item);
    await assertStoreIdentity(token);
  });
}
export async function restoreStorePurchases(): Promise<void> {
  const token = generation;
  await serial(async () => { await assertStoreIdentity(token); await Purchases.restorePurchases(); await assertStoreIdentity(token); });
}
export async function manageStorePurchases(): Promise<void> {
  const token = generation;
  await serial(async () => {
    await assertStoreIdentity(token);
    const info = await Purchases.getCustomerInfo();
    await assertStoreIdentity(token);
    if (!info.managementURL) throw new Error('No store subscription management link is available.');
    const url = new URL(info.managementURL);
    if (url.protocol !== 'https:') throw new Error('Store management requires HTTPS.');
    await Linking.openURL(url.href);
  });
}
export function checkoutKey(): string { throw new Error('Stripe checkout is web-only.'); }
export async function openBillingURL(_url: string): Promise<void> { throw new Error('Stripe checkout is web-only.'); }
`;
}

function billingScreenSource(): string {
  return `import { useCallback, useEffect, useRef, useState } from 'react';
import { Redirect } from 'expo-router';
import { Screen, Stack } from '@workspace/ui/components/layout';
import { Text } from '@workspace/ui/components/text';
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
  if (data?.identity.appUserId !== userId) return <Stack><Text>{message || 'Loading subscriptions…'}</Text><Button onPress={retry}>Retry subscriptions</Button></Stack>;
  return <BillingContent data={data} message={message} pending={pending} run={run} checkout={checkout} />;
}
function Entitlements({ state }: { state: BillingEntitlements }) {
  return <Stack><Text variant="title" accessibilityRole="header">Last server-verified access</Text>{state.entitlements.map((item) => <Text key={item.key}>{item.key}: {item.active ? 'Active' : 'Inactive'}</Text>)}<Text>Checked: {state.checkedAt}</Text></Stack>;
}
type Actions = { pending: boolean; run: (action: () => Promise<void>) => Promise<void> };
function WebPlans({ data, pending, run, checkout }: Actions & { data: Data; checkout: (plan: string) => Promise<void> }) {
  if (!data.identity.providers.stripe) return <Text>Web checkout is not configured for this product.</Text>;
  return <Stack>{data.identity.plans.map((plan) => <Button key={plan.id} disabled={pending} onPress={() => void run(() => checkout(plan.id))}>{plan.label}</Button>)}<Button disabled={pending} onPress={() => void run(async () => openBillingURL((await billingApi.portal()).url))}>Manage web subscription</Button></Stack>;
}
function NativePlans({ data, pending, run }: Actions & { data: Data }) {
  if (!data.identity.providers.revenuecat) return <Text>Native store purchases are not selected.</Text>;
  return <Stack>{data.offers.map((offer) => <Button key={offer.id} disabled={pending} onPress={() => void run(() => purchaseStoreOffer(offer.id))}>{offer.label + ' — ' + offer.price}</Button>)}<Button disabled={pending} onPress={() => void run(restoreStorePurchases)}>Restore purchases</Button><Button disabled={pending} onPress={() => void run(manageStorePurchases)}>Manage store subscription</Button></Stack>;
}
function BillingContent({ data, message, pending, run, checkout }: Actions & { data: Data; message: string; checkout: (plan: string) => Promise<void> }) {
  return <Screen>
    <Text variant="title" accessibilityRole="header">Subscriptions</Text>
    <Entitlements state={data.state} />
    {billingPlatform === 'web' ? <WebPlans data={data} pending={pending} run={run} checkout={checkout} /> : <NativePlans data={data} pending={pending} run={run} />}
    <Button disabled={pending} onPress={() => void run(async () => undefined)}>Refresh server access</Button>
    <Text accessibilityLiveRegion="polite">{message}</Text>
    <Text>Purchases grant access only after server verification. Store account transfers follow the configured provider policy.</Text>
  </Screen>;
}
`;
}

function put(root: string, file: string, source: string): void {
  writeSource(root, file, file.startsWith('apps/mobile/') ? expoUiSource(root, source) : source);
}
