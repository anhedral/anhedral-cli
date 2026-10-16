import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import { scaffoldRealtime } from '../dist/scaffold/services.js';
import { scaffoldApi } from '../dist/scaffold/api.js';
import { scaffoldWeb } from '../dist/scaffold/web.js';
import { createRecipeContext } from '../dist/registry/context.js';
import { parseStandardOptions } from '../dist/standard.js';
import { bootstrap } from './support/workspace-bootstrap.mjs';

function loadGeneratedModule(
  source,
  require = () => {
    throw new Error('Unexpected import');
  },
) {
  const exports = {};
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(compiled, { exports, require, TextEncoder });
  return exports;
}

test('room messages enforce UTF-8/binary size limits and broadcast once to peers without echo', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-room-'));
  try {
    scaffoldRealtime(
      createRecipeContext(root, parseStandardOptions([root, '--hono', '--realtime'])),
    );
    const source = readFileSync(path.join(root, 'apps/realtime/src/index.ts'), 'utf8');
    const { Room } = loadGeneratedModule(source, (name) => {
      assert.equal(name, 'cloudflare:workers');
      return {
        DurableObject: class {
          constructor(ctx) {
            this.ctx = ctx;
          }
        },
      };
    });
    const received = [];
    const closed = [];
    const sender = {
      send: () => assert.fail('Do not echo to sender'),
      close: (...args) => closed.push(args),
    };
    const peer = { send: (message) => received.push(message) };
    const room = new Room({ getWebSockets: () => [sender, peer] });
    room.webSocketMessage(sender, 'hello');
    const binary = new ArrayBuffer(16384);
    room.webSocketMessage(sender, binary);
    assert.deepEqual(received, ['hello', binary]);
    room.webSocketMessage(sender, '🙂'.repeat(4097));
    room.webSocketMessage(sender, new ArrayBuffer(16385));
    assert.equal(received.length, 2);
    assert.deepEqual(closed, [
      [1009, 'Message too large'],
      [1009, 'Message too large'],
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('theme shortcut cleanup preserves modifier, repeat and editable-target behavior', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-theme-'));
  try {
    bootstrap(root);
    mkdirSync(path.join(root, 'apps/web/components'), { recursive: true });
    writeFileSync(
      path.join(root, 'apps/web/components/theme-provider.tsx'),
      `
function isTypingTarget(target: {tagName:string, isContentEditable?:boolean} | null) {
  return target && (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT");
}
export function ThemeProvider() {
  return function onKeyDown(event: KeyboardEvent) {
    if (event.defaultPrevented || event.repeat) { return }
    if (event.metaKey || event.ctrlKey || event.altKey) { return }
    if (event.key.toLowerCase() !== "d") { return }
    if (isTypingTarget(event.target)) { return }
    return true;
  };
}
`,
    );
    scaffoldWeb(createRecipeContext(root, parseStandardOptions([root, '--next'])));
    const source = readFileSync(path.join(root, 'apps/web/components/theme-provider.tsx'), 'utf8');
    const handler = loadGeneratedModule(source).ThemeProvider();
    const event = {
      key: 'd',
      defaultPrevented: false,
      repeat: false,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      target: null,
    };
    assert.equal(handler(event), true);
    assert.equal(handler({ ...event, key: 'D' }), true);
    for (const key of ['defaultPrevented', 'repeat', 'metaKey', 'ctrlKey', 'altKey'])
      assert.equal(handler({ ...event, [key]: true }), undefined);
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT'])
      assert.equal(handler({ ...event, target: { tagName } }), undefined);
    assert.equal(
      handler({ ...event, target: { tagName: 'DIV', isContentEditable: true } }),
      undefined,
    );
    assert.equal(handler({ ...event, key: 'x' }), undefined);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('API source renders an arbitrary display label as data rather than executable text', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-api-label-'));
  try {
    const options = { ...parseStandardOptions([root, '--hono']), name: 'customer\'s "app"' };
    scaffoldApi(createRecipeContext(root, options));
    const source = readFileSync(path.join(root, 'apps/api/src/index.ts'), 'utf8');
    const file = ts.createSourceFile('index.ts', source, ts.ScriptTarget.Latest, true);
    assert.deepEqual(file.parseDiagnostics, []);
    assert.ok(source.includes(JSON.stringify(options.name)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
