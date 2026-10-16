export const PROJECT_STARTER_PROMPT =
  'Create a new project using [@Anhedral](plugin://anhedral@anhedral). Start by explaining the stack and asking me what it should be about.';

export function newProjectDraftMessage() {
  return {
    role: 'user' as const,
    content: [{ type: 'text' as const, text: PROJECT_STARTER_PROMPT }],
    _meta: { 'openai/message': { target: 'new' as const, send: false } },
  };
}

export function newProjectDraftUrl() {
  return `codex://new?${new URLSearchParams({ prompt: PROJECT_STARTER_PROMPT })}`;
}

/** Prepare a current-conversation draft; the host must leave submission to the user. */
export function projectDraftMessage(text: string) {
  return {
    role: 'user' as const,
    content: [{ type: 'text' as const, text }],
    _meta: { 'openai/message': { target: 'active' as const, send: false } },
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** This local plugin requires advertised desktop draft semantics; standard ui/message does not. */
export function supportsUnsentDrafts(capabilities: unknown, platform: unknown): boolean {
  if (platform !== 'desktop') return false;
  if (!record(capabilities) || !Object.hasOwn(capabilities, 'experimental')) return false;
  const experimental = capabilities.experimental;
  return (
    record(experimental) &&
    Object.hasOwn(experimental, 'openai/message') &&
    record(experimental['openai/message'])
  );
}

type DraftMessage =
  ReturnType<typeof projectDraftMessage> | ReturnType<typeof newProjectDraftMessage>;

/** Decide before the RPC: an unsupported host might ignore metadata and submit immediately. */
export async function deliverUnsentDraft(
  message: DraftMessage,
  capabilities: unknown,
  platform: unknown,
  send: (message: DraftMessage) => Promise<{ isError?: boolean }>,
  copy: (text: string) => Promise<void>,
): Promise<'composer' | 'clipboard'> {
  if (supportsUnsentDrafts(capabilities, platform)) {
    try {
      if (!(await send(message)).isError) return 'composer';
    } catch {
      // Retain the unsent text when a supported host cannot open its draft.
    }
  }
  await copy(message.content[0].text);
  return 'clipboard';
}
