import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { parseStandardOptions } from '../dist/standard.js';
import { resolveStackRegistry } from '../dist/registry/resolve.js';
import { composeStack } from '../dist/scaffold/compose.js';
import { CAPABILITY_CONTRACT } from '../dist/capability-contract.js';
import { bootstrap } from './support/workspace-bootstrap.mjs';

async function fixture(flags, run) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-stream-'));
  try {
    const options = parseStandardOptions([root, '--stream', ...flags]);
    bootstrap(root);
    await composeStack(root, options, resolveStackRegistry(options));
    await run(root, options);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const read = (root, file) => readFileSync(path.join(root, file), 'utf8');

for (const [name, flags, runtime, env] of [
  ['Vinext', [], 'web', 'env.example'],
  ['Vercel', ['--next'], 'web', '.env.example'],
  ['Hono', ['--hono'], 'api', 'env.example'],
  ['OpenNext', ['--next', '--hosting=cloudflare'], 'web', '.dev.vars.example'],
]) {
  test(`${name} composes Stream with private runtime examples and a server-only export`, () =>
    fixture(flags, (root) => {
      const pkg = JSON.parse(read(root, 'packages/stream/package.json'));
      assert.deepEqual(pkg.exports, { './server': './src/server.ts' });
      assert.deepEqual(pkg.dependencies, {});
      assert.match(read(root, `apps/${runtime}/${env}`), /^STREAM_API_TOKEN=$/m);
      assert.match(read(root, `apps/${runtime}/${env}`), /^STREAM_ACCOUNT_ID=$/m);
      assert.match(read(root, 'packages/stream/README.md'), /DELETE it on stop/);
      assert.match(read(root, 'docs/stack.md'), /stream/);
    }));
}

test('Stream is independent of messaging and live SQL and requires a server', () => {
  const options = parseStandardOptions(['app', '--stream', '--realtime', '--neon-realtime']);
  for (const product of ['stream', 'realtime', 'neon-realtime', 'neon'])
    assert.ok(options.products.includes(product));
  assert.ok(!parseStandardOptions(['app', '--stream']).products.includes('neon'));
  assert.throws(() => parseStandardOptions(['app', '--expo', '--stream']), /server runtime/);
  const capability = CAPABILITY_CONTRACT.products.find((entry) => entry.id === 'stream');
  assert.equal(capability.provisioning.support, 'scaffold-only');
  assert.equal(capability.provisioning.evidence, 'unverified');
});

test('generated Stream management requests preserve explicit privacy and redact provider failures', async () => {
  await fixture(['--hono'], async (root) => {
    const file = path.join(root, 'stream-test.mjs');
    writeFileSync(
      file,
      ts.transpileModule(read(root, 'packages/stream/src/server.ts'), {
        compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
      }).outputText,
    );
    const program = ts.createProgram([path.join(root, 'packages/stream/src/server.ts')], {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      types: [],
      lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    });
    assert.deepEqual(
      ts
        .getPreEmitDiagnostics(program)
        .map((entry) => ts.flattenDiagnosticMessageText(entry.messageText, '\n')),
      [],
    );
    const { createStream } = await import(pathToFileURL(file).href);
    const accountId = 'a'.repeat(32);
    const uid = 'b'.repeat(32);
    assert.throws(() => createStream({ accountId: '../other', apiToken: 'secret' }), /Configure/);
    assert.throws(() => createStream({ accountId, apiToken: ' ' }), /Configure/);
    const stream = createStream({ accountId, apiToken: 'secret' });
    const previous = globalThis.fetch;
    const calls = [];
    try {
      globalThis.fetch = async (url, init) => {
        calls.push({ url, init });
        return Response.json({
          success: true,
          result: {
            uid,
            webRTC: { url: 'https://customer-test.cloudflarestream.com/secret/webRTC/publish' },
            webRTCPlayback: {
              url: 'https://customer-test.cloudflarestream.com/' + uid + '/webRTC/play',
            },
            rtmps: { streamKey: 'unrelated-secret' },
          },
        });
      };
      assert.throws(() => stream.createLiveInput({ name: 'Live' }), /explicit/);
      assert.throws(() => stream.getLiveInput('../other'), /Invalid/);
      for (const requireSignedURLs of [true, false]) {
        const input = await stream.createLiveInput({ name: 'Live', requireSignedURLs });
        assert.deepEqual(Object.keys(input).sort(), ['uid', 'webRTC', 'webRTCPlayback']);
        const call = calls.at(-1);
        assert.equal(
          call.url,
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/live_inputs`,
        );
        assert.equal(call.init.method, 'POST');
        assert.equal(call.init.headers.Authorization, 'Bearer secret');
        assert.equal(call.init.redirect, 'error');
        assert.deepEqual(JSON.parse(call.init.body), {
          meta: { name: 'Live' },
          recording: { mode: 'off', requireSignedURLs },
        });
      }
      await stream.getLiveInput(uid);
      assert.equal(calls.at(-1).init.method, 'GET');
      assert.ok(calls.at(-1).url.endsWith('/' + uid));
      for (const response of [
        new Response('publish-secret', { status: 403 }),
        new Response('publish-secret'),
        Response.json(null),
        Response.json({ success: false, errors: [{ message: 'publish-secret' }] }),
        Response.json({ success: true, result: { uid } }),
      ]) {
        globalThis.fetch = async () => response;
        await assert.rejects(stream.getLiveInput(uid), (error) => {
          assert.match(error.message, /Stream/);
          assert.doesNotMatch(error.message, /publish-secret/);
          return true;
        });
      }
    } finally {
      globalThis.fetch = previous;
    }
  });
});
