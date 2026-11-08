import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  readContractSnapshot,
  contractTargets,
} from '../scripts/contracts/deployment-contract-snapshot.mjs';
import {
  assertPublishedModules,
  checkRepositoryBoundary,
  policy,
  sourceViolations,
} from '../scripts/checks/repository-boundaries.mjs';

test('public repository contains only reviewed portable source and client modules', () => {
  assert.equal(checkRepositoryBoundary(), policy.modules.length);
});
test('private imports cannot bypass boundaries through types, re-exports or computed loads', () => {
  for (const source of [
    'import type { X } from "@anhedral/db";',
    'export * from "@anhedral/business-model";',
    'const x = import("../../anhedral-main/apps/api/src/app.ts");',
    'const x = require("@anhedral/platform-contracts");',
    'type T = import("@anhedral/db/schema").T;',
    'import x = require("@anhedral/db");',
    'const x = import(target);',
    'const x = require(`@anhedral/db`);',
  ])
    assert.ok(sourceViolations('src/standard.ts', source).length, source);
  assert.deepEqual(
    sourceViolations('src/standard.ts', 'import { x } from "./composition/composition.js";'),
    [],
  );
  assert.deepEqual(sourceViolations('src/contracts/deployment.ts', 'import { z } from "zod";'), []);
});
test('generation, transport and Platform client keep distinct dependency layers', () => {
  for (const [file, source] of [
    ['src/standard.ts', 'import "./platform/command.js";'],
    ['src/platform/command.ts', 'import "../composition/recipes.js";'],
    ['src/contracts/deployment.ts', 'export * from "../platform/state.js";'],
    ['src/contracts/deployment.ts', 'import "node:fs";'],
    ['src/platform/state.ts', 'import "stripe";'],
  ])
    assert.ok(sourceViolations(file, source).length, file);
  assert.deepEqual(sourceViolations('src/cli-commands.ts', 'import "./platform/command.js";'), []);
  assert.deepEqual(
    sourceViolations('src/platform/command.ts', 'import "../contracts/cli-transport.js";'),
    [],
  );
});
test('packed modules reject additions, missing declarations and private implementation', () => {
  const files = policy.modules.flatMap((name) => [`dist/${name}.js`, `dist/${name}.d.ts`]);
  assertPublishedModules(files);
  for (const changed of [
    [...files, 'dist/private-hosting.js'],
    files.slice(1),
    [...files, 'dist/source.js.map'],
  ])
    assert.throws(() => assertPublishedModules(changed));
});

test('snapshot checks reject missing, extra and altered contract files and licenses', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-snapshot-boundary-'));
  const manifest = JSON.parse(readFileSync('assets/contracts/deployment-provenance.json'));
  try {
    for (const [name, target] of Object.entries(contractTargets))
      writeFileSync(path.join(directory, name), readFileSync(target));
    const save = (value) =>
      writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(value));
    save(manifest);
    readContractSnapshot(directory);
    for (const changed of [
      { ...manifest, license: 'PROPRIETARY' },
      { ...manifest, files: { ...manifest.files, 'private.ts': 'a'.repeat(64) } },
      { ...manifest, files: {} },
    ]) {
      save(changed);
      assert.throws(() => readContractSnapshot(directory));
    }
    save(manifest);
    writeFileSync(path.join(directory, 'deployment.ts'), 'tampered');
    assert.throws(() => readContractSnapshot(directory));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
