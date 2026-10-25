import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, symlinkSync, rmSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import {
  validateNativeQADirectory,
  nativeQASourceManifest,
  seedNativeQADocument,
  nativeQADocumentContent,
} from '../scripts/native-ui-device.mjs';
test('native QA preparation accepts an empty or owned app and refuses unrelated files and symlink outputs', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-qa-owner-')),
    qa = path.join(root, 'app'),
    owner = '/test/native-root/';
  try {
    validateNativeQADirectory(qa, owner);
    mkdirSync(qa);
    validateNativeQADirectory(qa, owner);
    writeFileSync(path.join(qa, 'App.tsx'), 'preserve this source');
    assert.throws(() => validateNativeQADirectory(qa, owner), /unrelated QA/);
    assert.equal(readFileSync(path.join(qa, 'App.tsx'), 'utf8'), 'preserve this source');
    writeFileSync(
      path.join(qa, 'QA-OWNER.json'),
      JSON.stringify({ root: owner, kind: 'native-registry-qa', schemaVersion: 1 }),
    );
    validateNativeQADirectory(qa, owner);
    assert.throws(() => validateNativeQADirectory(qa, owner + 'other'), /unrelated QA/);
    symlinkSync(path.join(root, 'missing'), path.join(qa, 'package.json'));
    assert.throws(() => validateNativeQADirectory(qa, owner), /symlinked QA output/);
    const alias = path.join(root, 'alias');
    symlinkSync(qa, alias, 'dir');
    assert.throws(() => validateNativeQADirectory(alias, owner), /symlinked QA application/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('native QA manifests identify the actual copied app and reject source symlinks', () => {
  const qa = mkdtempSync(path.join(tmpdir(), 'anhedral-qa-source-'));
  try {
    mkdirSync(path.join(qa, '.generated', 'src'), { recursive: true });
    writeFileSync(path.join(qa, '.generated', 'src', 'fixture.tsx'), 'export const value=1;');
    for (const file of ['App.tsx', 'app.json', 'package.json'])
      writeFileSync(path.join(qa, file), 'source');
    const first = nativeQASourceManifest(qa);
    assert.ok(first.files['.generated/src/fixture.tsx']);
    writeFileSync(path.join(qa, '.generated', 'src', 'fixture.tsx'), 'export const value=2;');
    assert.notEqual(
      nativeQASourceManifest(qa).files['.generated/src/fixture.tsx'],
      first.files['.generated/src/fixture.tsx'],
    );
    symlinkSync(path.join(qa, 'App.tsx'), path.join(qa, '.generated', 'linked.tsx'));
    assert.throws(() => nativeQASourceManifest(qa), /symlinked native QA source/);
  } finally {
    rmSync(qa, { recursive: true, force: true });
  }
});

test('system picker fixtures are idempotent and preserve unrelated files and symlinks', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-document-'));
  try {
    const target = seedNativeQADocument(directory);
    assert.equal(readFileSync(target, 'utf8'), nativeQADocumentContent);
    assert.equal(seedNativeQADocument(directory), target);
    writeFileSync(target, 'unrelated');
    assert.throws(() => seedNativeQADocument(directory), /unrelated/);
    assert.equal(readFileSync(target, 'utf8'), 'unrelated');
    rmSync(target);
    const other = path.join(directory, 'preserved.txt');
    writeFileSync(other, nativeQADocumentContent);
    symlinkSync(other, target);
    assert.throws(() => seedNativeQADocument(directory), /unrelated/);
    assert.equal(readFileSync(other, 'utf8'), nativeQADocumentContent);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('native instrumentation binds its required sweep total to unique copied authored roots', async () => {
  const { nativeQAStoryCountSource } = await import('../scripts/native-ui-device.mjs');
  const source = 'private let count = 0 // ANHEDRAL_AUTHORED_STORY_COUNT';
  const catalog = {
    recipes: [
      { kind: 'example', style: 'base', name: 'one' },
      { kind: 'block', style: 'native', name: 'two' },
      { kind: 'support', style: 'base', name: 'helper' },
    ],
  };
  assert.match(
    nativeQAStoryCountSource(source, catalog),
    /count = 2 \/\/ ANHEDRAL_AUTHORED_STORY_COUNT/,
  );
  assert.throws(() => nativeQAStoryCountSource('', catalog), /marker/);
  assert.throws(() => nativeQAStoryCountSource(source + source, catalog), /marker/);
  assert.throws(
    () => nativeQAStoryCountSource(source, { recipes: [] }),
    /requires authored stories/,
  );
  assert.throws(
    () => nativeQAStoryCountSource(source, { recipes: [catalog.recipes[0], catalog.recipes[0]] }),
    /Duplicate/,
  );
});
