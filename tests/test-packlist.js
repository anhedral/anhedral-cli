import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSyncPortable } from '../scripts/spawn-command.mjs';
import { parseNpmPackJson } from './support/npm-pack.js';
import { renderStack, stackSize } from '../docs/assets/render-stack.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const npmCache = mkdtempSync(path.join(tmpdir(), 'anhedral-packlist-'));
const nativeRegistry = JSON.parse(
  readFileSync(path.join(repoRoot, 'assets/ui/native/registry.json'), 'utf8'),
);
const nativeFiles = [
  ...nativeRegistry.components.map((item) => item.file),
  ...nativeRegistry.supportFiles,
  'registry.json',
].map((file) => 'assets/ui/native/' + file);
const requiredFiles = new Set([
  'LICENSE',
  'README.md',
  'assets/patches/braces@3.0.3.patch',
  'assets/patches/LICENSE.braces',
  'assets/patches/node-forge@1.4.0.patch',
  'assets/patches/LICENSE.node-forge',
  'assets/patches/audit-deps.mjs',
  'assets/ui/native/registry.json',
  'assets/ui/native-overlay.json.br',
  'docs/native-ui.md',
  'docs/native-registry.md',
  'assets/ui/web/input.tsx',
  'assets/ui/web/label.tsx',
  'assets/ui/theme.tsx',
  'assets/ui/LICENSE.shadcn',
  'assets/ui/UPSTREAM.json',
  'assets/ui/UPSTREAM-LOCK.json',
  'dist/bin.js',
  'dist/index.d.ts',
  'dist/index.js',
  'package.json',
  'docs/anhedral-stack.md',
  'docs/assets/anhedral-stack.png',
  'docs/assets/anhedral-stack-light.png',
  'docs/stack-standard.md',
  'docs/software-factory.md',
  'docs/verification.md',
]);
const allowedRootFiles = new Set(['LICENSE', 'README.md', 'package.json']);
const allowedArtwork = new Set([
  'docs/assets/anhedral-stack.png',
  'docs/assets/anhedral-stack-light.png',
]);

function assertPackedMarkdownLinks(sourcePath, markdown, packedFiles) {
  const references = [
    ...markdown.matchAll(/\]\(([^)]+)\)/g),
    ...markdown.matchAll(/\b(?:src|srcset)="([^"]+)"/g),
  ];
  for (const match of references) {
    const target = match[1].trim().replace(/^<|>$/g, '');
    if (/^(?:https?:|mailto:|plugin:|#)/.test(target)) continue;
    const pathTarget = target.split('#', 1)[0];
    if (!pathTarget) continue;
    const resolvedTarget = path.posix.normalize(
      path.posix.join(path.posix.dirname(sourcePath), pathTarget),
    );
    assert.ok(
      !resolvedTarget.startsWith('../') && packedFiles.includes(resolvedTarget),
      `packed ${sourcePath} link target must be published: ${target}`,
    );
  }
}

try {
  const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
  const license = readFileSync(path.join(repoRoot, 'LICENSE'), 'utf8');
  assert.equal(packageJson.sideEffects, false);
  assert.equal(packageJson.homepage, 'https://github.com/anhedral/anhedral-cli#readme');
  assert.deepEqual(packageJson.repository, {
    type: 'git',
    url: 'git+https://github.com/anhedral/anhedral-cli.git',
  });
  assert.deepEqual(packageJson.bugs, { url: 'https://github.com/anhedral/anhedral-cli/issues' });
  assert.equal(packageJson.license, 'Apache-2.0');
  assert.match(license, /Apache License\s+Version 2\.0, January 2004/i);
  assert.match(license, /Grant of Copyright License/i);
  assert.match(license, /Grant of Patent License/i);
  assert.match(license, /Copyright 2026 Anhedral, Inc\./i);
  assert.doesNotMatch(license, /proprietary and confidential/i);

  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSyncPortable(
    npmCommand,
    ['pack', '--dry-run', '--json', '--ignore-scripts'],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        npm_config_cache: npmCache,
      },
    },
  );

  assert.equal(
    result.status,
    0,
    `npm pack --dry-run failed\nstdout:\n${result.stdout ?? ''}\nstderr:\n${result.stderr ?? ''}`,
  );

  const [packed] = parseNpmPackJson(String(result.stdout ?? ''));
  assert.ok(packed, 'npm pack should describe one package');
  const files = packed.files.map((file) => file.path);
  assert.ok(
    !files.some((file) => file.startsWith('assets/ui/official/')),
    'The full upstream review mirror stays outside the shipped starter artifact',
  );

  assert.equal(new Set(files).size, files.length, 'packlist should not contain duplicate paths');
  for (const file of files) {
    assert.doesNotMatch(
      file,
      /managed-hosting|sponsorships|NORTHSTAR|(?:^|\/)growth(?:\/|$)/,
      'commercial implementation and planning must stay outside the public package',
    );
  }
  assert.equal(packed.entryCount, files.length, 'entryCount should match the packlist length');
  assert.ok(
    // Full official native fonts and chart recipes are shipped as a lossless Brotli overlay.
    // Keep a bounded 1.25 MB artifact budget; source parity is checked independently.
    packed.size < 1_250_000,
    `packed artifact should remain below 1.25 MB; received ${packed.size}`,
  );
  assert.ok(
    // The reviewed forge patch includes its two minified browser distributions.
    packed.unpackedSize < 3_000_000,
    `unpacked artifact should remain below 3 MB; received ${packed.unpackedSize}`,
  );

  for (const requiredFile of requiredFiles) {
    assert.ok(files.includes(requiredFile), `packlist should contain ${requiredFile}`);
  }

  const readme = readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  assert.match(readme, /open source under the \[Apache License 2\.0\]\(LICENSE\)/i);
  assert.match(
    readme,
    /Generated applications[\s\S]+developers can customize and license for their products/i,
  );
  assert.doesNotMatch(readme, /does not grant permission to install|separate written agreement/i);
  assertPackedMarkdownLinks('README.md', readme, files);
  assertPackedMarkdownLinks(
    'docs/anhedral-stack.md',
    readFileSync(path.join(repoRoot, 'docs/anhedral-stack.md'), 'utf8'),
    files,
  );
  for (const light of [false, true]) {
    const name = `anhedral-stack${light ? '-light' : ''}`;
    assert.equal(
      readFileSync(path.join(repoRoot, `docs/assets/${name}.svg`), 'utf8'),
      renderStack(light),
      'committed artwork must match the canonical renderer',
    );
    const png = readFileSync(path.join(repoRoot, `docs/assets/${name}.png`));
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), stackSize.width);
    assert.equal(png.readUInt32BE(20), stackSize.height);
  }
  assertPackedMarkdownLinks(
    'docs/stack-standard.md',
    readFileSync(path.join(repoRoot, 'docs/stack-standard.md'), 'utf8'),
    files,
  );
  assertPackedMarkdownLinks(
    'docs/software-factory.md',
    readFileSync(path.join(repoRoot, 'docs/software-factory.md'), 'utf8'),
    files,
  );

  for (const file of packed.files) {
    const allowedNativeUI =
      file.path === 'assets/ui/native/registry.json' ||
      file.path === 'assets/ui/native-overlay.json.br' ||
      /^assets\/ui\/(?:web\/(?:button|input|label)\.tsx|theme\.tsx|theme-storage\.ts|native-fonts\.json\.gz|registry-themes\.json\.gz|LICENSE\.shadcn|UPSTREAM\.json|UPSTREAM-LOCK\.json)$/.test(
        file.path,
      );
    const allowedDist = file.path.startsWith('dist/') && /\.(?:d\.ts|js)$/.test(file.path);
    const allowedDocumentation =
      file.path === 'docs/anhedral-stack.md' ||
      file.path === 'docs/native-ui.md' ||
      file.path === 'docs/native-registry.md' ||
      file.path === 'docs/stack-standard.md' ||
      file.path === 'docs/software-factory.md' ||
      file.path === 'docs/verification.md';
    const allowedPatch = [
      'assets/patches/braces@3.0.3.patch',
      'assets/patches/LICENSE.braces',
      'assets/patches/node-forge@1.4.0.patch',
      'assets/patches/LICENSE.node-forge',
      'assets/patches/audit-deps.mjs',
    ].includes(file.path);
    const allowed =
      allowedRootFiles.has(file.path) ||
      allowedNativeUI ||
      allowedDist ||
      allowedDocumentation ||
      allowedArtwork.has(file.path) ||
      allowedPatch;
    assert.ok(allowed, `unexpected published path: ${file.path}`);
    if (!allowedDocumentation)
      assert.doesNotMatch(
        file.path,
        /(^|\/)(?:\.env|src|tests?|scripts?|\.github|node_modules|\.git)(?:\/|$)/,
      );
    assert.doesNotMatch(file.path, /\.(?:map|tgz|tsbuildinfo)$/);
  }

  const binEntry = packed.files.find((file) => file.path === 'dist/bin.js');
  assert.ok(binEntry, 'packlist should describe dist/bin.js');
  assert.notEqual(binEntry.mode & 0o111, 0, 'dist/bin.js should be executable');

  console.log(`Packlist policy passed: ${files.length} files, ${packed.size} packed bytes`);
} finally {
  rmSync(npmCache, { recursive: true, force: true });
}
