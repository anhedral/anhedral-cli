import { useRealtimeKitClient } from '@cloudflare/realtimekit-react-native';
import { Button, View } from 'react-native';
export function Call({ getToken }: { getToken: () => Promise<string> }) {
  const [meeting, init] = useRealtimeKitClient();
  async function join() {
    const client = await init({
      authToken: await getToken(),
      defaults: { audio: false, video: false },
    });
    if (client) await client.join();
  }
  return (
    <View>
      {meeting ? (
        <>
          <Button
            title="Toggle microphone"
            onPress={() =>
              meeting.self.audioEnabled ? meeting.self.disableAudio() : meeting.self.enableAudio()
            }
          />
          <Button
            title="Toggle camera"
            onPress={() =>
              meeting.self.videoEnabled ? meeting.self.disableVideo() : meeting.self.enableVideo()
            }
          />
          <Button title="Leave" onPress={() => meeting.leave()} />
        </>
      ) : (
        <Button title="Join call" onPress={join} />
      )}
    </View>
  );
}
