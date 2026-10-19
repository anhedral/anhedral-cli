import '@/global.css';
import '@/lib/development-client';

import { PortalHost } from '@rn-primitives/portal';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return <><Stack /><PortalHost /></>;
}
