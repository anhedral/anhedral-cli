import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PROJECT_STARTER_PROMPT,
  newProjectDraftMessage,
  newProjectDraftUrl,
  projectDraftMessage,
  supportsUnsentDrafts,
  deliverUnsentDraft,
} from '../shared/starter.ts';

test('Create site opens a fresh editable draft and never submits or targets an existing project', () => {
  const message = newProjectDraftMessage();
  assert.equal(message._meta['openai/message'].target, 'new');
  assert.equal(message._meta['openai/message'].send, false);
  assert.equal(message.content[0].text, PROJECT_STARTER_PROMPT);
  const url = new URL(newProjectDraftUrl());
  assert.equal(url.protocol, 'codex:');
  assert.equal(url.hostname, 'new');
  assert.equal(url.searchParams.get('prompt'), PROJECT_STARTER_PROMPT);
  assert.deepEqual([...url.searchParams.keys()], ['prompt']);
  assert.match(PROJECT_STARTER_PROMPT, /plugin:\/\/anhedral@anhedral/);
});

const advertised = { experimental: { 'openai/message': {} } };
for (const [label, capabilities, platform] of [
  ['unknown host', undefined, undefined],
  ['standard desktop', { message: { text: {} } }, 'desktop'],
  ['mobile extension', advertised, 'mobile'],
  ['web extension without Work-specific draft proof', advertised, 'web'],
  ['unknown platform', advertised, undefined],
  ['invalid platform', advertised, 'Desktop'],
  ['null capability', { experimental: { 'openai/message': null } }, 'desktop'],
  ['array capability', { experimental: { 'openai/message': [] } }, 'web'],
  ['boolean capability', { experimental: { 'openai/message': true } }, 'desktop'],
  ['inherited capability', { experimental: Object.create({ 'openai/message': {} }) }, 'desktop'],
  ['inherited experimental', Object.create(advertised), 'desktop'],
] as const) {
  test(`${label} never receives a message RPC for either unsent draft target`, async () => {
    let calls = 0;
    const copied: string[] = [];
    const send = async () => {
      calls++;
      return {};
    };
    const copy = async (text: string) => {
      copied.push(text);
    };
    assert.equal(supportsUnsentDrafts(capabilities, platform), false);
    for (const message of [
      newProjectDraftMessage(),
      projectDraftMessage('Review the selected project.'),
    ])
      assert.equal(
        await deliverUnsentDraft(message, capabilities, platform, send, copy),
        'clipboard',
      );
    assert.equal(calls, 0);
    assert.deepEqual(copied, [PROJECT_STARTER_PROMPT, 'Review the selected project.']);
  });
}

for (const platform of ['desktop'])
  test(`${platform} advertised extension receives valid unsent new and active drafts`, async () => {
    const sent: unknown[] = [];
    const copied: string[] = [];
    const send = async (message: unknown) => {
      sent.push(message);
      return {};
    };
    assert.equal(supportsUnsentDrafts(advertised, platform), true);
    const messages = [
      newProjectDraftMessage(),
      projectDraftMessage('Review deployment prerequisites.'),
    ];
    for (const message of messages)
      assert.equal(
        await deliverUnsentDraft(message, advertised, platform, send, async (text) => {
          copied.push(text);
        }),
        'composer',
      );
    assert.deepEqual(sent, messages);
    assert.deepEqual(copied, []);
    assert.deepEqual(
      messages.map((message) => message._meta['openai/message']),
      [
        { target: 'new', send: false },
        { target: 'active', send: false },
      ],
    );
  });

test('supported host errors retain copyable draft and clipboard errors propagate for visible fallback', async () => {
  const copied: string[] = [];
  for (const send of [
    async () => ({ isError: true }),
    async () => {
      throw new Error('Unsupported draft');
    },
  ])
    assert.equal(
      await deliverUnsentDraft(
        projectDraftMessage('Safe draft'),
        advertised,
        'desktop',
        send,
        async (text) => {
          copied.push(text);
        },
      ),
      'clipboard',
    );
  assert.deepEqual(copied, ['Safe draft', 'Safe draft']);
  let calls = 0;
  await assert.rejects(
    deliverUnsentDraft(
      newProjectDraftMessage(),
      undefined,
      undefined,
      async () => {
        calls++;
        return {};
      },
      async () => {
        throw new Error('Clipboard denied');
      },
    ),
    /Clipboard denied/,
  );
  assert.equal(calls, 0);
});
