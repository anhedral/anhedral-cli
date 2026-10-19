import { Text, View } from 'react-native';
import { authConfigurationError } from '@/lib/auth-client';

export function AuthConfiguration({ children }: { children: React.ReactNode }) {
  const error = authConfigurationError();
  if (error) return <View style={{ padding: 24, gap: 12 }}><Text accessibilityRole="header">Configure the product API</Text><Text selectable>{error}</Text></View>;
  return <>{children}</>;
}
