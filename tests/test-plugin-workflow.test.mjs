import { readProjectSection, writeProjectSection } from '../dist/project-config.js';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { packagePlugin } from '../scripts/package-plugin.mjs';

const root = path.resolve(import.meta.dirname, '..');
// This acceptance fixture exercises an isolated CLI tree and the exact ZIP payload.
// It does not prove host installation, conversational agent behavior or provider access.
test('packaged plugin and isolated CLI carry a coherent local beginner workflow', async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-plugin-workflow-'));
  try {
    const metadata = packagePlugin(root, temporary);
    const bytes = readFileSync(path.join(temporary, metadata.filename));
    assert.equal(metadata.size, bytes.length);
    assert.equal(
      metadata.integrity,
      `sha512-${createHash('sha512').update(bytes).digest('base64')}`,
    );
    const plugin = path.join(temporary, 'installed-plugin');
    mkdirSync(plugin);
    for (let offset = 0; bytes.readUInt32LE(offset) === 0x04034b50;) {
      assert.equal(bytes.readUInt16LE(offset + 8), 0, 'Fixture expects stored ZIP entries');
      const size = bytes.readUInt32LE(offset + 18);
      const nameSize = bytes.readUInt16LE(offset + 26);
      const extraSize = bytes.readUInt16LE(offset + 28);
      const name = bytes.subarray(offset + 30, offset + 30 + nameSize).toString();
      assert.ok(!path.isAbsolute(name) && !name.split('/').includes('..'));
      const start = offset + 30 + nameSize + extraSize;
      const destination = path.join(plugin, name);
      mkdirSync(path.dirname(destination), { recursive: true });
      writeFileSync(destination, bytes.subarray(start, start + size));
      offset = start + size;
    }
    const manifest = JSON.parse(readFileSync(path.join(plugin, 'plugin.json')));
    const references = path.join(plugin, 'references');
    const registry = JSON.parse(readFileSync(path.join(references, 'capabilities.json')));
    const installed = path.join(temporary, 'node_modules/anhedral');
    mkdirSync(installed, { recursive: true });
    cpSync(path.join(root, 'dist'), path.join(installed, 'dist'), { recursive: true });
    cpSync(path.join(root, 'assets/patches'), path.join(installed, 'assets/patches'), {
      recursive: true,
    });
    cpSync(path.join(root, 'package.json'), path.join(installed, 'package.json'));
    for (const dependency of Object.keys(
      JSON.parse(readFileSync(path.join(root, 'package.json'))).dependencies,
    )) {
      cpSync(
        path.join(root, 'node_modules', dependency),
        path.join(temporary, 'node_modules', dependency),
        { recursive: true, dereference: true },
      );
    }
    const cli = path.join(installed, 'dist/bin.js');
    const run = (...args) =>
      spawnSync(process.execPath, [cli, ...args], { cwd: temporary, encoding: 'utf8' });
    const successful = (...args) => {
      const result = run(...args);
      assert.equal(result.status, 0, result.stderr);
      return result.stdout;
    };
    assert.equal(successful('--version').trim(), manifest.version);
    assert.equal(registry.cliVersion, manifest.version);
    assert.equal(metadata.cliVersion, manifest.version);
    for (const [document, source] of [
      ['stack-standard.md', 'stack-standard.md'],
      ['software-factory.md', 'software-factory.md'],
    ]) {
      assert.equal(
        readFileSync(path.join(references, document), 'utf8'),
        readFileSync(path.join(root, 'docs', source), 'utf8'),
      );
    }
    assert.deepEqual(manifest.extensions['com.openai'].interface.defaultPrompt, [
      'Create a new project using [@Anhedral](plugin://anhedral@anhedral). Start by explaining the stack and asking me what it should be about.',
    ]);
    const app = path.join(temporary, 'my-first-app');
    const plan = JSON.parse(successful('init', app, '--dry-run', '--json'));
    assert.deepEqual(plan.products, ['better-auth', 'd1', 'expo', 'hono', 'r2', 'styling']);
    assert.equal(plan.hosting, 'cloudflare');
    assert.equal(existsSync(app), false, 'Planning must not create the app');
    const api = await import(pathToFileURL(path.join(installed, 'dist/index.js')).href);
    assert.deepEqual(api.CAPABILITY_REGISTRY, registry);
    const stackRegistry = JSON.parse(readFileSync(path.join(references, 'stack-registry.json')));
    assert.deepEqual(api.STACK_REGISTRY, stackRegistry);
    assert.deepEqual(JSON.parse(successful('registry', 'list', '--json')), stackRegistry);
    assert.deepEqual(plan.registry, api.resolveStackRegistry(plan));
    // The official network bootstrap is replaced here; generated overlays and the CLI are real.
    const options = api.parseStandardOptions([app, '--skip-install', '--no-git', '--json']);
    const log = console.log;
    console.log = () => {};
    try {
      await api.scaffoldStandardProject(options, () =>
        assert.fail('Offline generation must not spawn commands'),
      );
    } finally {
      console.log = log;
    }
    writeFileSync(path.join(app, 'pnpm-lock.yaml'), 'lockfileVersion: \"9.0\"\n');
    const diagnosis = JSON.parse(successful('doctor', app, '--json'));
    assert.equal(diagnosis.localReady, true);
    assert.equal(diagnosis.productionReady, false);
    const before = JSON.parse(successful('status', app, '--json'));
    assert.equal(before.project.provider, 'cloudflare');
    assert.equal(before.project.ownership, 'customer');
    assert.equal(before.project.audience, 'unconfigured');
    assert.deepEqual(before.releases, []);
    const delivery = JSON.parse(successful('ship', app, '--dry-run', '--json'));
    assert.equal(delivery.resourcesProvisioned, false);
    assert.deepEqual(
      delivery.deployments.map(({ directory }) => directory),
      ['apps/api', 'apps/mobile'],
    );
    assert.equal(delivery.project.deliveryEngine, 'wrangler');
    assert.equal(delivery.project.id, before.project.id);
    assert.equal(existsSync(path.join(app, '.anhedral/releases.json')), false);
    const blocked = run('ship', app, '--json');
    assert.equal(blocked.status, 1, 'An unconnected starter must not be represented as shipped');
    assert.equal(JSON.parse(successful('status', app, '--json')).releases.length, 0);
    const setup = readProjectSection(app, 'setup');
    setup.cliVersion = '0.0.0';
    writeProjectSection(app, 'setup', setup);
    const stale = run('doctor', app, '--json');
    assert.equal(stale.status, 1);
    assert.equal(JSON.parse(stale.stdout).localReady, false, 'Version drift must fail readiness');
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
