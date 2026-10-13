import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('plugin entrypoints and public starter documentation use the exact composer prefill', () => {
  const prompt =
    'Create a new project using [@Anhedral](plugin://anhedral@anhedral). Start by explaining the stack and asking me what it should be about.';
  const manifest = JSON.parse(read('plugins/anhedral/plugin.json'));
  assert.deepEqual(manifest.extensions['com.openai'].interface.defaultPrompt, [prompt]);
  assert.ok(read('README.md').includes(prompt));
  assert.ok(read('docs/plugin-ui.md').includes(prompt));
  assert.ok(read('plugin-app/shared/starter.ts').includes(prompt));
});

test('plugin instructions and documentation do not imply credentials enable unimplemented live readers', () => {
  for (const file of ['docs/plugin-ui.md', 'plugins/anhedral/skills/anhedral/SKILL.md']) {
    const source = read(file);
    assert.match(source, /no live analytics/i);
    assert.match(source, /schedule-execution reader/);
    assert.doesNotMatch(
      source,
      /rows remain unavailable until|Analytics remains.*until an actual provider/,
    );
  }
  assert.match(read('docs/cli-design.md'), /help text is never parsed/);
});
