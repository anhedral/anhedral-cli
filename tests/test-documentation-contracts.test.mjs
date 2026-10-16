import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('plugin entrypoints and public starter documentation use the exact composer prefill', () => {
  const prompt =
    'Create a new project using [@Anhedral](plugin://anhedral@anhedral). Start by explaining the stack and asking me what it should be about.';
  const manifest = JSON.parse(read('plugins/codex/distribution/plugin.json'));
  assert.deepEqual(manifest.extensions['com.openai'].interface.defaultPrompt, [prompt]);
  assert.ok(read('README.md').includes(prompt));
  assert.ok(read('docs/software-factory.md').includes(prompt));
  assert.ok(read('plugins/codex/inspector/shared/starter.ts').includes(prompt));
});

test('plugin instructions and documentation do not imply credentials enable unimplemented live readers', () => {
  for (const file of [
    'docs/software-factory.md',
    'plugins/codex/distribution/skills/anhedral/SKILL.md',
  ]) {
    const source = read(file);
    assert.match(source, /explicit service controls/i);
    assert.match(source, /schedule-execution reader/);
    assert.doesNotMatch(
      source,
      /rows remain unavailable until|Analytics remains.*until an actual provider/,
    );
  }
  assert.match(read('docs/software-factory.md'), /help text is never parsed/);
});

test('Cloudflare delivery documentation distinguishes Void activation checkpoints from Wrangler provisioning', () => {
  const factory = read('docs/software-factory.md');
  const providers = read('docs/software-factory.md');
  assert.match(factory, /Void can activate a target before recording new resource identities/);
  assert.match(providers, /If Wrangler resource provisioning changes tracked binding IDs/);
  assert.match(providers, /Void may already activate targets/);
  assert.match(providers, /noninteractive `void secret put` with stdin/);
  assert.match(providers, /Wrangler Cloudflare delivery uploads runtime credentials/);
});

test('generated-profile CI uses a runtime compatible with the pinned Void minimum', () => {
  const workflow = read('.github/workflows/ci.yml');
  const generated = workflow.slice(workflow.indexOf('\n  generated:'));
  assert.ok(generated.length > 0);
  const versions = [...generated.matchAll(/\bnode:\s*(?:\[)?'([0-9]+\.[0-9]+\.[0-9]+)'/g)].map(
    (match) => match[1],
  );
  assert.ok(versions.length > 0);
  for (const version of versions) {
    const [major, minor] = version.split('.').map(Number);
    assert.ok(
      major > 24 || (major === 24 && minor >= 21),
      `Generated CI runtime ${version} cannot execute Void`,
    );
  }
  assert.match(workflow, /'20\.19\.0'/);
  assert.match(workflow, /'22\.12\.0'/);
});
