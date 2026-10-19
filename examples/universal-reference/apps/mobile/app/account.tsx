import { useEffect, useState } from 'react';
import { Link, Redirect, router } from 'expo-router';
import { Text, View } from 'react-native';
import type { Session } from '@workspace/contracts';
import { Button } from '@/components/ui/button';
import { AuthConfiguration } from '@/components/auth-configuration';
import { getAuthClient } from '@/lib/auth-client';
import { sessionApi } from '@/lib/session-api';

export default function AccountRoute() { return <AuthConfiguration><Account /></AuthConfiguration>; }

function Account() {
  const { data: session, isPending, refetch } = getAuthClient().useSession();
  const userId = session?.user.id;
  const [verified, setVerified] = useState<Session['user'] | null>(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true;
    if (userId) void sessionApi.session().then(
      (current) => { if (active) { setVerified(current.user); setMessage(''); } },
      () => { if (active) { setVerified(null); setMessage('The server could not verify this session. Sign in again or retry when connected.'); } },
    );
    return () => { active = false; };
  }, [userId]);
  async function signOut() {
    setVerified(null); setPending(true); setMessage('');
    try {
      const result = await getAuthClient().signOut();
      if (result.error) { setMessage(result.error.message ?? 'Sign out failed.'); return; }
      await refetch(); router.replace('/sign-in');
    } catch { setMessage('Unable to sign out. Check the connection and retry.'); }
    finally { setPending(false); }
  }
  if (isPending) return <View style={{ padding: 24 }}><Text>Restoring session…</Text></View>;
  if (!session) return <Redirect href="/sign-in" />;
  return <AccountContent userId={session.user.id} verified={verified} message={message} pending={pending} signOut={signOut} />;
}

function accountMessage(userId: string, verified: Session['user'] | null, message: string): string {
  if (verified?.id === userId) return verified.email;
  return message || 'Verifying with the API…';
}
function AccountContent({ userId, verified, message, pending, signOut }: {
  userId: string; verified: Session['user'] | null; message: string; pending: boolean; signOut: () => Promise<void>;
}) {
  return <View style={{ padding: 24, gap: 12 }}>
    <Text accessibilityRole="header">Account</Text>
    <Text>{accountMessage(userId, verified, message)}</Text>
    <Text accessibilityLiveRegion="polite">{message}</Text>
    <Button disabled={pending} onPress={() => void signOut()}>{pending ? 'Signing out…' : 'Sign out'}</Button>
    <Link href="/sign-in">Sign in again</Link>
    <Link href="/">Home</Link>
  </View>;
}
