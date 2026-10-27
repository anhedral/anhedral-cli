import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSyncPortable } from '../scripts/spawn-command.mjs';
import { parseNpmPackJson } from './support/npm-pack.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const npmCache = mkdtempSync(path.join(tmpdir(), 'anhedral-packlist-'));
const stackFiles = [
  'assets/stack/ai-schema.ts.txt',
  'assets/stack/ai.ts.txt',
  'assets/stack/api-index.ts.txt',
  'assets/stack/auth-features.ts.txt',
  'assets/stack/auth-journal.json.txt',
  'assets/stack/auth-migration.sql.txt',
  'assets/stack/auth-routes.ts.txt',
  'assets/stack/auth-schema.ts.txt',
  'assets/stack/auth-snapshot.json.txt',
  'assets/stack/auth.ts.txt',
  'assets/stack/billing-mode.ts.txt',
  'assets/stack/billing-schema.ts.txt',
  'assets/stack/desktop.rs.txt',
  'assets/stack/entitlement-guard.ts.txt',
  'assets/stack/entitlements.ts.txt',
  'assets/stack/events-schema.ts.txt',
  'assets/stack/events.ts.txt',
  'assets/stack/mobile-auth.ts.txt',
  'assets/stack/mobile-billing.tsx.txt',
  'assets/stack/mobile-session.tsx.txt',
  'assets/stack/native-button.tsx.txt',
  'assets/stack/native-global.css.txt',
  'assets/stack/native-lib-utils.ts.txt',
  'assets/stack/native-metro.config.js.txt',
  'assets/stack/native-nativewind-env.d.ts.txt',
  'assets/stack/native-tailwind.config.js.txt',
  'assets/stack/native-text.tsx.txt',
  'assets/stack/purchases.ts.txt',
  'assets/stack/revenuecat.ts.txt',
  'assets/stack/rtc-schema.ts.txt',
  'assets/stack/rtc.ts.txt',
  'assets/stack/security.ts.txt',
  'assets/stack/storage.ts.txt',
  'assets/stack/stripe.ts.txt',
  'assets/stack/web-sign-in.tsx.txt',
];
const requiredFiles = new Set([
  ...stackFiles,
  'docs/capabilities.md',
  'dist/capability-command.js',
  'dist/capability-recipes.js',
  'dist/capability-editor.js',
  'dist/capability-references.js',
  'LICENSE',
  'README.md',
  'assets/patches/braces@3.0.3.patch',
  'assets/patches/LICENSE.braces',
  'assets/patches/node-forge@1.4.0.patch',
  'assets/patches/LICENSE.node-forge',
  'assets/patches/audit-deps.mjs',
  'docs/native-ui.md',
  'assets/ui/web/button.tsx',
  'assets/ui/web/input.tsx',
  'assets/ui/web/label.tsx',
  'assets/ui/LICENSE.shadcn',
  'assets/ui/UPSTREAM.json',
  'assets/ui/catalog.json',
  'assets/ui/extensions/registry.json',
  'assets/ui/LICENSE.react-native-reusables',
  'docs/ui.md',
  'dist/ui-command.js',
  'dist/ui-catalog.js',
  'dist/ui-project.js',
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
const webProvenance = JSON.parse(
  readFileSync(path.join(repoRoot, 'assets/ui/UPSTREAM.json'), 'utf8'),
);
assert.equal(webProvenance.native, undefined, 'Web provenance must not reference the retired port');
assert.deepEqual(Object.keys(webProvenance.files).sort(), ['button', 'input', 'label']);
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
    packed.size < 1_000_000,
    `packed artifact should remain below 1 MB; received ${packed.size}`,
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
  assert.match(readme, /Apache-2\.0/);
  assert.match(readme, /Generated applications are editable source/);
  assert.doesNotMatch(readme, /does not grant permission to install|separate written agreement/i);
  assertPackedMarkdownLinks('README.md', readme, files);
  assertPackedMarkdownLinks(
    'docs/anhedral-stack.md',
    readFileSync(path.join(repoRoot, 'docs/anhedral-stack.md'), 'utf8'),
    files,
  );
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
    assert.doesNotMatch(
      file.path,
      /^(?:assets\/ui\/(?:native\/|native-portal\/|theme(?:-storage)?\.)|dist\/(?:platforms\/mobile\.|scaffold\/(?:native-ui|expo-runtime)\.))/,
      'Retired native port must not return to the published CLI',
    );
    const allowedNativeUI =
      [
        'assets/ui/catalog.json',
        'assets/ui/extensions/registry.json',
        'assets/ui/LICENSE.react-native-reusables',
      ].includes(file.path) ||
      /^assets\/ui\/(?:web\/(?:button|input|label)\.tsx|LICENSE\.shadcn|UPSTREAM(?:-LOCK)?\.json)$/.test(
        file.path,
      );
    const allowedDist = file.path.startsWith('dist/') && /\.(?:d\.ts|js)$/.test(file.path);
    const allowedDocumentation =
      file.path === 'docs/anhedral-stack.md' ||
      file.path === 'docs/native-ui.md' ||
      file.path === 'docs/ui.md' ||
      file.path === 'docs/capabilities.md' ||
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
      stackFiles.includes(file.path) ||
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
