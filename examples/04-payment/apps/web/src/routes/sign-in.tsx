import { createFileRoute } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Route = createFileRoute('/sign-in')({ component: Account });

function Account() {
  const { data: session, isPending, error: sessionError, refetch } = authClient.useSession();
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const email = String(data.get('email') ?? '');
    const password = String(data.get('password') ?? '');
    setBusy(true);
    setError('');
    try {
      const result = creating
        ? await authClient.signUp.email({ email, password, name: String(data.get('name') ?? '') })
        : await authClient.signIn.email({ email, password });
      if (result.error) setError(result.error.message ?? 'Unable to sign in. Check your details and try again.');
      else await refetch();
    } catch {
      setError('Unable to reach the account service. Try again.');
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await authClient.signOut();
      if (result.error) setError(result.error.message ?? 'Unable to sign out. Try again.');
      else await refetch();
    } catch {
      setError('Unable to reach the account service. Try again.');
    } finally {
      setBusy(false);
    }
  }
  if (isPending) return <p role="status">Loading your account…</p>;
  if (sessionError) return <section className="stack"><h1>Account unavailable</h1><p role="alert">Unable to load your account. Check that the API and authentication are configured.</p><Button onClick={() => void refetch()}>Try again</Button></section>;
  if (session) return <section className="stack"><h1>Your account</h1><p>{session.user.email}</p>{error && <p role="alert">{error}</p>}<Button disabled={busy} onClick={() => void signOut()}>{busy ? 'Signing out…' : 'Sign out'}</Button></section>;
  return <section className="stack"><h1>{creating ? 'Create an account' : 'Sign in'}</h1><p className="muted">Email and password must be explicitly enabled in the API authentication configuration.</p><form onSubmit={submit}>{creating && <><Label htmlFor="name">Name</Label><Input id="name" name="name" autoComplete="name" required maxLength={160} /></>}<Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} /><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete={creating ? 'new-password' : 'current-password'} required minLength={8} maxLength={128} />{error && <p role="alert">{error}</p>}<Button type="submit" disabled={busy}>{busy ? 'Working…' : creating ? 'Create account' : 'Sign in'}</Button><Button type="button" variant="ghost" disabled={busy} onClick={() => { setCreating(!creating); setError(''); }}>{creating ? 'Already have an account? Sign in' : 'Create an account'}</Button></form></section>;
}
