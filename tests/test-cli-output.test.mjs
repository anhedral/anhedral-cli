import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { formatResult } from '../dist/cli-output.js';

// Captured before splitting the formatter: the human contract stays stable across
// command families while arbitrary provider payloads remain outside the summary.
const fixtures = JSON.parse(readFileSync(new URL('./fixtures/cli-output.json', import.meta.url)));
for (const { name, command, value, expected } of fixtures) {
  test(`human output preserves ${name}`, () => {
    const output = formatResult(command, value);
    assert.equal(output, expected);
    assert.doesNotMatch(output, /confidential-fixture/);
  });
}

test('core registry items explain inclusion rather than suggesting an unsupported addition', () => {
  const output = formatResult('registry', {
    name: 'd1',
    type: 'service',
    description: 'Drizzle with Cloudflare D1',
  });
  assert.match(output, /Included in every project created with anhedral init/);
  assert.doesNotMatch(output, /anhedral add/);
});

test('ordinary initialization summarizes the core without dumping registry or setup metadata', () => {
  const output = formatResult('init', {
    root: '/project',
    products: ['better-auth', 'd1', 'expo', 'hono', 'r2', 'styling'],
    hosting: 'cloudflare',
    registry: { items: [{ source: 'confidential-fixture' }] },
    setup: { credentials: ['confidential-fixture'] },
  });
  assert.match(output, /Stack: better-auth, d1, expo, hono, r2, styling/);
  assert.doesNotMatch(output, /confidential-fixture|registry|credentials/);
});
