import assert from 'node:assert/strict';
import { test } from 'node:test';
import { existsSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { pathToFileURL } from 'node:url';
import {
  parseStandardOptions,
  scaffoldStandardProject,
  addStackItems,
  inspectProject,
  FULL_PRODUCT,
  createSetupPlan,
} from '../dist/index.js';
import { readProjectSection } from '../dist/project-config.js';
import { sourceFiles } from '../dist/registry/receipt.js';
import { bootstrap } from './support/workspace-bootstrap.mjs';
const runner = (_command, args, cwd) => {
  if (args[0] === 'dlx')
    bootstrap(path.join(args[args.indexOf('--cwd') + 1], args[args.indexOf('--name') + 1]));
  else if (args.includes('--lockfile-only'))
    writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n');
  else throw new Error(`Unexpected command: ${args}`);
};
const read = (root, file) => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
async function generate(root, flags = []) {
  await scaffoldStandardProject(
    parseStandardOptions([root, ...flags, '--skip-install', '--no-git']),
    runner,
    { quiet: true },
  );
}
async function importGenerated(root, name) {
  const file = path.join(root, name + '.mjs');
  let source = readFileSync(path.join(root, `packages/${name}/src/server.ts`), 'utf8');
  if (['realtimekit', 'video'].includes(name)) {
    source = source
      .replace("import { z } from 'zod';", '')
      .replace(
        "import { cloudflareClient } from '@workspace/cloudflare-api/server';",
        readFileSync(path.join(root, 'packages/cloudflare-api/src/server.ts'), 'utf8'),
      )
      .replace(
        "from 'zod'",
        'from ' + JSON.stringify(pathToFileURL(path.resolve('node_modules/zod/index.js')).href),
      );
  }
  writeFileSync(
    file,
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  );
  return import(pathToFileURL(file).href);
}

test('minimal defaults omit backend resources and secrets; capabilities resolve only needed dependencies', () => {
  const products = (...flags) => parseStandardOptions(['app', ...flags]).products;
  assert.deepEqual(products(), ['expo']);
  assert.deepEqual(products('--preset=minimal'), ['expo']);
  assert.deepEqual(products('--wxt'), ['wxt']);
  assert.deepEqual(products('--d1'), ['d1', 'expo', 'hono']);
  assert.deepEqual(products('--better-auth'), ['better-auth', 'd1', 'expo', 'hono']);
  assert.deepEqual(products('--workers-ai'), ['expo', 'hono', 'workers-ai']);
  assert.deepEqual(products('--images'), ['expo', 'hono', 'images']);
  assert.deepEqual(products('--revenuecat'), ['better-auth', 'd1', 'expo', 'hono', 'revenuecat']);
  const full = products('--preset', 'full-product');
  for (const id of FULL_PRODUCT) assert.ok(full.includes(id), id);
  assert.deepEqual(products('--images', '--better-auth'), products('--better-auth', '--images'));
  const overridden = products('--preset=full-product', '--next', '--neon', '--clerk');
  for (const id of ['expo', 'd1', 'better-auth']) assert.ok(!overridden.includes(id));
  for (const id of ['next', 'neon', 'clerk', 'realtimekit', 'video'])
    assert.ok(overridden.includes(id));
  assert.throws(() => products('--preset=everything'), /preset must/);
  assert.throws(() => products('--preset'), /Supply a value/);
  const minimal = createSetupPlan(parseStandardOptions(['app']));
  assert.deepEqual(minimal.registry.items.find((item) => item.name === 'expo').environment, []);
  assert.ok(!minimal.setup.tools.includes('Selected database tooling'));
});

test('minimal app grows to backend, accounts and billing without overwriting edited screens; previews are read-only', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-progressive-'));
  const root = path.join(temp, 'app');
  try {
    await generate(root);
    for (const target of ['apps/api', 'packages/auth', 'packages/db', 'packages/billing'])
      assert.ok(!existsSync(path.join(root, target)), target);
    assert.equal(read(root, 'apps/mobile/wrangler.jsonc').services, undefined);
    const screen = path.join(root, 'apps/mobile/app/index.tsx');
    const edited = readFileSync(screen, 'utf8') + '\n// customer-owned screen\n';
    writeFileSync(screen, edited);
    const before = sourceFiles(root);
    const preview = await addStackItems(root, { items: ['better-auth'], dryRun: true }, runner);
    assert.deepEqual(preview.conflicts, []);
    for (const id of ['hono', 'd1', 'better-auth']) assert.ok(preview.items.includes(id), id);
    assert.deepEqual(sourceFiles(root), before);
    await addStackItems(root, { items: ['better-auth'], skipInstall: true }, runner);
    assert.equal(readFileSync(screen, 'utf8'), edited);
    assert.equal(read(root, 'apps/mobile/wrangler.jsonc').services[0].binding, 'API');
    assert.ok(existsSync(path.join(root, 'apps/mobile/lib/auth-client.native.ts')));
    assert.ok(existsSync(path.join(root, 'packages/contracts/package.json')));
    assert.equal(inspectProject(root).localReady, true);
    await addStackItems(root, { items: ['stripe', 'revenuecat'], skipInstall: true }, runner);
    assert.equal(readFileSync(screen, 'utf8'), edited);
    assert.ok(existsSync(path.join(root, 'packages/billing/src/server.ts')));
    assert.ok(!readProjectSection(root, 'setup').products.includes('r2'));
    assert.equal(inspectProject(root).localReady, true);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('adding billing directly to a minimal app preserves native SDK environment examples', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-direct-billing-'));
  const root = path.join(temp, 'app');
  try {
    await generate(root);
    await addStackItems(root, { items: ['stripe', 'revenuecat'], skipInstall: true }, runner);
    const environment = readFileSync(path.join(root, 'apps/mobile/.env.example'), 'utf8');
    assert.match(environment, /^EXPO_PUBLIC_API_URL=/m);
    assert.match(environment, /^EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=/m);
    assert.match(environment, /^EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=/m);
    assert.equal(inspectProject(root).localReady, true);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('data added after server service adapters preserves typed context and lazy setup', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-services-growth-'));
  const root = path.join(temp, 'app');
  try {
    await generate(root, ['--images']);
    await addStackItems(root, { items: ['better-auth'], skipInstall: true }, runner);
    const source = readFileSync(path.join(root, 'apps/api/src/index.ts'), 'utf8');
    assert.equal((source.match(/Variables: \{/g) ?? []).length, 1);
    assert.match(source, /database: \(\) => ReturnType<typeof createDatabase>/);
    assert.match(source, /services: ReturnType<typeof createServices>/);
    assert.equal(inspectProject(root).localReady, true);
    assert.ok(!readProjectSection(root, 'setup').products.includes('r2'));
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('full-product composes Cloudflare bindings and server-only media helpers; helper calls are scoped and private', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-full-product-'));
  const root = path.join(temp, 'app');
  const originalFetch = globalThis.fetch;
  try {
    await generate(root, ['--preset=full-product']);
    assert.equal(inspectProject(root).localReady, true);
    const config = read(root, 'apps/api/wrangler.jsonc');
    assert.equal(config.ai.binding, 'AI');
    assert.equal(config.images.binding, 'IMAGES');
    assert.equal(config.analytics_engine_datasets[0].binding, 'EVENTS');
    assert.equal(config.r2_buckets[0].binding, 'FILES');
    const api = read(root, 'apps/api/package.json');
    const mobile = read(root, 'apps/mobile/package.json');
    for (const name of ['images', 'video', 'realtimekit', 'analytics-engine']) {
      assert.equal(api.dependencies['@workspace/' + name], 'workspace:*');
      assert.equal(mobile.dependencies['@workspace/' + name], undefined);
      assert.deepEqual(read(root, `packages/${name}/package.json`).exports, {
        './server': './src/server.ts',
      });
    }
    const { recordEvent } = await importGenerated(root, 'analytics-engine');
    let event;
    recordEvent(
      {
        writeDataPoint: (value) => {
          event = value;
        },
      },
      'tenant',
      'opened',
    );
    assert.deepEqual(event, { indexes: ['tenant'], blobs: ['opened'], doubles: [1] });
    assert.throws(() => recordEvent({}, '', 'opened'), /Invalid/);
    const { resizeImage } = await importGenerated(root, 'images');
    const result = await resizeImage(
      {
        input: () => ({
          transform: () => ({ output: async () => ({ response: () => new Response('image') }) }),
        }),
      },
      new ReadableStream(),
      400,
    );
    assert.equal(result.headers.get('cache-control'), 'private, no-store');
    await assert.rejects(resizeImage({}, new ReadableStream(), 99999), /Invalid/);
    const requests = [];
    globalThis.fetch = async (url, init) => {
      requests.push({ url, init });
      if (url.endsWith('/direct_upload'))
        return Response.json({
          success: true,
          result: { uid: 'video-id', uploadURL: 'https://upload.videodelivery.net/upload' },
        });
      return Response.json({
        success: true,
        data: { id: 'meeting-id', token: 'participant-only-token' },
      });
    };
    const { createVideo } = await importGenerated(root, 'video');
    await createVideo({ accountId: 'a'.repeat(32), apiToken: 'private' }).createUpload(120);
    assert.equal(JSON.parse(requests[0].init.body).requireSignedURLs, true);
    assert.ok(requests[0].url.endsWith('/stream/direct_upload'));
    const { createRealtimeKit } = await importGenerated(root, 'realtimekit');
    const kit = createRealtimeKit({
      accountId: 'a'.repeat(32),
      appId: 'owned-app',
      apiToken: 'private',
    });
    await kit.addParticipant('11111111-1111-4111-8111-111111111111', 'verified-user', 'viewer');
    assert.equal(JSON.parse(requests[1].init.body).custom_participant_id, 'verified-user');
    assert.equal(requests[1].init.redirect, 'error');
    globalThis.fetch = async () =>
      new Response('private-provider-payload', { headers: { 'content-type': 'application/json' } });
    await assert.rejects(kit.createMeeting('test'), (error) => {
      assert.equal(error.message, 'Invalid Cloudflare JSON response.');
      return true;
    });
  } finally {
    globalThis.fetch = originalFetch;
    rmSync(temp, { recursive: true, force: true });
  }
});
