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
