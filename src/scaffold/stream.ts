import { rmSync } from 'node:fs';
import path from 'node:path';
import type { RecipeContext } from '../registry/types.js';
import { patchPackage, put, sharedPackage } from './files.js';
import { writeEnvironmentFile } from './environment.js';

export function scaffoldStream({ root, options, runtimeApp }: RecipeContext): void {
  sharedPackage(root, 'stream', '', {});
  rmSync(path.join(root, 'packages/stream/src/index.ts'));
  patchPackage(root, 'packages/stream/package.json', {
    exports: { './server': './src/server.ts' },
  });
  put(root, 'packages/stream/src/server.ts', streamServer);
  put(root, 'packages/stream/README.md', streamGuide);
  const app = `apps/${runtimeApp}`;
  const native = runtimeApp === 'web' && options.hosting === 'vercel';
  writeEnvironmentFile(root, `${app}/${native ? '.env.example' : '.dev.vars.example'}`, {
    STREAM_ACCOUNT_ID: '',
    STREAM_API_TOKEN: '',
  });
  if (!native)
    put(
      root,
      `${app}/${runtimeApp === 'api' ? 'src/' : ''}stream-secrets.d.ts`,
      runtimeApp === 'api'
        ? 'interface Env { STREAM_ACCOUNT_ID: string; STREAM_API_TOKEN: string }\n'
        : 'declare namespace Cloudflare { interface Env { STREAM_ACCOUNT_ID: string; STREAM_API_TOKEN: string } }\n',
    );
}

const streamServer = `// Server code only. Never serialize a live input directly to viewers: it contains a publish credential.
export interface StreamLiveInput {
  uid: string;
  webRTC: { url: string };
  webRTCPlayback: { url: string };
}

export function createStream(options: { accountId: string; apiToken: string }) {
  if (!/^[a-f0-9]{32}$/i.test(options.accountId) || !options.apiToken.trim()) {
    throw new Error('Configure server-only STREAM_ACCOUNT_ID and STREAM_API_TOKEN.');
  }
  const base = 'https://api.cloudflare.com/client/v4/accounts/' + options.accountId + '/stream/live_inputs';
  async function request(url: string, init: RequestInit): Promise<StreamLiveInput> {
    const response = await fetch(url, {
      ...init,
      headers: { Authorization: 'Bearer ' + options.apiToken, 'Content-Type': 'application/json' },
      redirect: 'error',
      signal: AbortSignal.timeout(30_000),
    });
    // Do not include provider bodies or URLs in errors: they can contain broadcast credentials.
    if (!response.ok) throw new Error('Stream live input request failed (HTTP ' + response.status + ').');
    const body = await response.json().catch(() => {
      throw new Error('Stream returned an invalid JSON response.');
    }) as { success?: boolean; result?: Partial<StreamLiveInput> } | null;
    const input = body?.result;
    if (body?.success !== true || typeof input?.uid !== 'string' ||
        typeof input.webRTC?.url !== 'string' || typeof input.webRTCPlayback?.url !== 'string') {
      throw new Error('Stream did not return a WebRTC live input.');
    }
    return { uid: input.uid, webRTC: { url: input.webRTC.url }, webRTCPlayback: { url: input.webRTCPlayback.url } };
  }
  return {
    // Call only after creator authorization and quota checks. Persist uid; do not create on every page load.
    // Select playback privacy explicitly. Signed playback still needs application token issuance.
    createLiveInput(input: { name: string; requireSignedURLs: boolean }) {
      if (!input.name.trim() || typeof input.requireSignedURLs !== 'boolean') {
        throw new Error('Supply a stream name and explicit signed-playback policy.');
      }
      return request(base, { method: 'POST', body: JSON.stringify({
        meta: { name: input.name }, recording: { mode: 'off', requireSignedURLs: input.requireSignedURLs },
      }) });
    },
    getLiveInput(uid: string) {
      if (!/^[a-f0-9]{32}$/i.test(uid)) throw new Error('Invalid Stream live input ID.');
      return request(base + '/' + uid, { method: 'GET' });
    },
  };
}
`;

const streamGuide = `# Cloudflare Stream Live WebRTC

Optional one-to-many live video using WHIP ingest and WHEP playback. GA since October 15, 2026. This is independent of --realtime Durable Object messaging and --neon-realtime live SQL. For many-to-many calls, review Cloudflare Realtime separately; this package does not scaffold conferencing.

## Server integration

Add @workspace/stream as a workspace:* dependency of the server app and import createStream from @workspace/stream/server. Pass { accountId: env.STREAM_ACCOUNT_ID, apiToken: env.STREAM_API_TOKEN }. The factory supports createLiveInput({ name, requireSignedURLs }) and getLiveInput(uid). It returns uid, webRTC.url (secret WHIP ingest) and webRTCPlayback.url (WHEP playback). No browser management client or public management route is generated.

Use a customer-owned account with Stream enabled and an account-scoped Stream Write API token. Configure the selected server app's ignored runtime file from its environment example (.env for Void, .dev.vars for Wrangler, .env.local for native Next.js). The root .env.example is an inventory. Configure production secrets explicitly with the selected host; anhedral ship does not activate Stream, create live inputs or install these runtime credentials automatically. There is no Wrangler resource binding for this integration. Never use a public environment prefix for the management token or publish URL.

Authorize creators and enforce quotas before creating/retrieving an input. Persist its uid with the owning user/tenant; authorize access before calling getLiveInput. Reuse the input on refresh; reconcile uncertain creates rather than blindly retrying. Return the WHIP URL only to its authorized broadcaster, with Cache-Control: no-store. Anyone possessing it can broadcast. Never return the full input to viewers or put it in logs, committed config, static assets or public build variables. Rotate compromised publish keys through Cloudflare's supported management workflow.

Select requireSignedURLs explicitly. For private viewing implement authenticated, short-lived Stream playback token issuance and verify WHEP rejects unsigned, expired and unauthorized access. Hosting protection alone does not protect Cloudflare's media endpoints. Origin restrictions are not user authorization. The helper does not issue playback tokens or establish private media acceptance.

## Browser integration

Use native RTCPeerConnection or a Cloudflare-supported WHIP/WHEP client. Follow the official browser tutorial below. Capture camera/microphone only after a user action over HTTPS or localhost; handle denied permissions, device selection and autoplay restrictions. Publish send-only tracks to the authorized WHIP URL; receive audio/video tracks through WHEP. Media flows directly between the browser and Stream, not through a Worker, Durable Object or database. Application routes handle identity, input ownership and authorized endpoint/token issuance.

Implement ICE negotiation (including gathering completion or Trickle ICE), failed-connection recovery and bounded retries. Retain the Location session resource from signaling, DELETE it on stop, close RTCPeerConnection and stop local camera/microphone tracks on failure, navigation and sign-out. Implement the player and creator UI for the product; this package is a management foundation, not a finished broadcast feature.

## Limits and acceptance

As reviewed October 16, 2026, WHIP ingest and WHEP playback must be paired. Recording, HLS/DASH playback of WHIP inputs, RTMP/SRT-to-WHEP bridging, restreaming and live viewer counts are unsupported. WebRTC usage appears in Stream analytics/billable usage; this does not promise broadcast or player-experience metrics. Delivery billing began October 15 at standard Stream rates; budget viewer-minutes (viewers multiplied by watch time), verify current pricing and account eligibility before activation.

Before claiming acceptance, exercise an authorized creator and viewer in separate browsers, denied creator/viewer access, cross-tenant input access, reconnect, camera denial, session teardown and usage visibility. Verify signed playback separately when selected. Scaffolding and local tests do not establish live video, latency or provider readiness.

- Release: https://developers.cloudflare.com/changelog/post/2026-10-15-stream-live-webrtc-ga/
- WebRTC and current limits: https://developers.cloudflare.com/stream/webrtc-beta/
- Browser tutorial: https://developers.cloudflare.com/stream/examples/browser-based-webrtc/
- Live input API: https://developers.cloudflare.com/api/resources/stream/subresources/live_inputs/methods/create/
- Pricing: https://developers.cloudflare.com/stream/pricing/
`;
