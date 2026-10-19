export interface StoreOffer { id: string; label: string; price: string }
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
