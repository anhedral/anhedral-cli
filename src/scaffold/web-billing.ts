import type { RecipeContext } from '../registry/types.js';
import { put } from './files.js';

export function scaffoldWebBilling({ root }: RecipeContext): void {
  put(root, 'apps/web/components/billing.tsx', WEB_BILLING);
  put(
    root,
    'apps/web/app/account/page.tsx',
    `import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionSchema } from '@workspace/contracts';
import { apiRequest } from '@/lib/server-api';
import { SignOut } from '@/components/sign-out';
import { Billing } from '@/components/billing';
export default async function Account() {
  const incoming = await headers();
  const response = await apiRequest(new Request('https://app.internal/api/session', { headers: { cookie: incoming.get('cookie') ?? '' } }));
  if (response.status === 401) redirect('/sign-in');
  if (!response.ok) throw Error('Session verification is unavailable.');
  const { user } = sessionSchema.parse(await response.json());
  return <section className="stack"><h1>Account</h1><p>{user.email}</p><Billing key={user.id} /><SignOut /></section>;
}
`,
  );
}
const WEB_BILLING = `'use client';
import { useEffect, useRef, useState } from 'react';
import { createBillingClient, type BillingIdentity, type BillingEntitlements } from '@workspace/contracts';
import { Button } from '@/components/ui/button';
const api = createBillingClient();
function navigate(value: string) {
  const url = new URL(value);
  const invalid = [url.protocol !== 'https:', !['checkout.stripe.com', 'billing.stripe.com'].includes(url.hostname), url.username, url.password];
  if (invalid.some(Boolean)) throw Error('Unrecognized billing destination.');
  window.location.assign(url.href);
}
export function Billing() {
  const [identity, setIdentity] = useState<BillingIdentity | null>(null);
  const [entitlements, setEntitlements] = useState<BillingEntitlements | null>(null);
  const [pending, setPending] = useState(false); const [error, setError] = useState('');
  const intents = useRef(new Map<string, string>());
  useEffect(() => { let active = true; void Promise.all([api.identity(), api.entitlements()]).then(([user, access]) => { if (active) { setIdentity(user); setEntitlements(access); } }).catch(() => { if (active) setError('Unable to verify subscriptions.'); }); return () => { active = false; }; }, []);
  function checkoutIntent(plan: string) { const key = intents.current.get(plan) ?? crypto.randomUUID(); intents.current.set(plan, key); return key; }
  async function checkout(plan: string) {
    if (pending || !identity) return;
    setPending(true); setError('');
    // Keep one intent through uncertain retries. The server controls customer, price and return URL.
    const key = checkoutIntent(plan);
    try { navigate((await api.checkout(plan, key)).url); } catch { setError('Checkout is unavailable. Retry to resume the same checkout.'); } finally { setPending(false); }
  }
  async function portal() { if (pending || !identity) return; setPending(true); setError(''); try { navigate((await api.portal()).url); } catch { setError('Billing management is unavailable.'); } finally { setPending(false); } }
  return <section className="stack" aria-label="Subscription"><h2>Subscription</h2><p>{entitlements?.entitlements.some((grant) => grant.active) ? 'Active access' : 'No verified subscription'}</p>{identity?.providers.stripe && <>{identity.plans.map((plan) => <Button key={plan.id} disabled={pending} onClick={() => void checkout(plan.id)}>{plan.label}</Button>)}<Button disabled={pending} onClick={() => void portal()}>Manage web subscription</Button></>}<p role="status">{error}</p></section>;
}
`;
