import { useRealtimeKitClient } from '@cloudflare/realtimekit-react';
import { RtkMeeting } from '@cloudflare/realtimekit-react-ui';

export function Call({ getToken }: { getToken: () => Promise<string> }) {
  const [meeting, init] = useRealtimeKitClient();
  const join = async () => {
    await init({ authToken: await getToken() });
  };
  return meeting ? (
    <RtkMeeting meeting={meeting} mode="fill" />
  ) : (
    <button onClick={join}>Join call</button>
  );
}
