import { AppBridge, PostMessageTransport } from '@modelcontextprotocol/ext-apps/app-bridge';
import type { McpUiHostContext } from '@modelcontextprotocol/ext-apps';

// Synthetic host using the installed SDK, not proof of native ChatGPT behavior.
const options = new URLSearchParams(location.search);
const fixture = { contexts: [] as unknown[], messages: [] as unknown[] };
Object.assign(window, { hostFixture: fixture });
const platform = options.get('platform') === 'web' ? 'web' : 'desktop';
const hostContext: McpUiHostContext = {
  platform,
  displayMode: 'fullscreen',
  theme: 'light',
  safeAreaInsets: { top: 24, right: 12, bottom: 48, left: 12 },
};
const bridge = new AppBridge(
  null,
  { name: 'Anhedral test host', version: '1.0.0' },
  {
    serverTools: {},
    updateModelContext: {},
    message: { text: {} },
    ...(options.has('drafts') ? { experimental: { 'openai/message': {} } } : {}),
  },
  { hostContext },
);
bridge.oncalltool = async ({ name, arguments: args }) => {
  const response = await fetch('/api/tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, args }),
  });
  if (!response.ok) throw new Error('Fixture tool failed');
  return { content: [], structuredContent: await response.json() };
};
bridge.onupdatemodelcontext = async (context) => {
  fixture.contexts.push(context);
  return {};
};
bridge.onmessage = async (message, context) => {
  // The SDK exposes request metadata on the handler context, not parsed params.
  fixture.messages.push({ ...message, _meta: context.mcpReq._meta });
  if (options.has('failDraft')) throw new Error('Fixture composer unavailable');
  return {};
};
const frame = document.createElement('iframe');
frame.title = 'Anhedral inspector';
frame.style.cssText = 'width:100%;height:100vh;border:0';
document.body.style.margin = '0';
document.body.append(frame);
await bridge.connect(new PostMessageTransport(frame.contentWindow!, frame.contentWindow!));
frame.src = '/host-app';
