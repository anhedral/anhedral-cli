import Purchases from 'react-native-purchases';
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
