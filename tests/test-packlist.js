import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertPublishedModules } from '../scripts/checks/repository-boundaries.mjs';
import { spawnSyncPortable } from '../scripts/spawn-command.mjs';
import { parseNpmPackJson } from './support/npm-pack.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const npmCache = mkdtempSync(path.join(tmpdir(), 'anhedral-packlist-'));
const stackFiles = [
  'assets/stack/access.js.txt',
  'assets/stack/api-client.js.txt',
  'assets/stack/call.tsx.txt',
  'assets/stack/cli-api.ts.txt',
  'assets/stack/cli-session.ts.txt',
  'assets/stack/client-origins.ts.txt',
  'assets/stack/client-sync.ts.txt',
  'assets/stack/browser-sync.js.txt',
  'assets/stack/api-access.d.ts.txt',
  'assets/stack/api-files.d.ts.txt',
  'assets/stack/api-index.d.ts.txt',
  'assets/stack/api-rtc.d.ts.txt',
  'assets/stack/api-session.d.ts.txt',
  'assets/stack/mobile-app.tsx.txt',
  'assets/stack/file-events.ts.txt',
  'assets/stack/mobile-sync.js.txt',
  'assets/stack/pg-auth-journal.json.txt',
  'assets/stack/pg-auth-migration.sql.txt',
  'assets/stack/pg-auth-routes.ts.txt',
  'assets/stack/pg-auth-schema.ts.txt',
  'assets/stack/pg-auth-snapshot.json.txt',
  'assets/stack/pg-auth.ts.txt',
  'assets/stack/pg-billing-schema.ts.txt',
  'assets/stack/pg-db-index.ts.txt',
  'assets/stack/pg-db-migrate.mjs.txt',
  'assets/stack/pg-drizzle.config.ts.txt',
  'assets/stack/pg-payment.test.mjs.txt',
  'assets/stack/pg-rtc-schema.ts.txt',
  'assets/stack/pg-security.ts.txt',
  'assets/stack/pg-storage.test.mjs.txt',
  'assets/stack/postgres-fixture.mjs.txt',
  'assets/stack/receipt-d1.ts.txt',
  'assets/stack/receipt-pg.ts.txt',
  'assets/stack/room-store-d1.ts.txt',
  'assets/stack/room-store-pg.ts.txt',
  'assets/stack/sync.d.ts.txt',
  'assets/stack/commander.ts.txt',
  'assets/stack/electron-main.ts.txt',
  'assets/stack/electron-package.js.txt',
  'assets/stack/electron-renderer.html.txt',
  'assets/stack/electron-renderer.tsx.txt',
  'assets/stack/electron-vite.js.txt',
  'assets/stack/files-client.js.txt',
  'assets/stack/native-call.tsx.txt',
  'assets/stack/purchases.ts.txt',
  'assets/stack/revenuecat.ts.txt',
  'assets/stack/rtc-client.js.txt',
  'assets/stack/rtc.ts.txt',
  'assets/stack/session.js.txt',
  'assets/stack/mobile-session.js.txt',
  'assets/stack/sync-client.js.txt',
  'assets/stack/sync-worker.ts.txt',

  'assets/stack/base-eslint.js.txt',
  'assets/stack/shared-eslint.config.mjs.txt',
  'assets/stack/api-proxy.ts.txt',
  'assets/stack/api-eslint.config.mjs.txt',
  'assets/stack/billing-providers.ts.txt',
  'assets/stack/drizzle.config.ts.txt',
  'assets/stack/db-migrate.mjs.txt',
  'assets/stack/db-index.ts.txt',
  'assets/stack/api-index.ts.txt',
  'assets/stack/backend.test.mjs.txt',
  'assets/stack/storage.test.mjs.txt',
  'assets/stack/payment.test.mjs.txt',

  'assets/stack/auth-features.ts.txt',
  'assets/stack/auth-journal.json.txt',
  'assets/stack/auth-migration.sql.txt',
  'assets/stack/auth-routes.ts.txt',
  'assets/stack/auth-schema.ts.txt',
  'assets/stack/auth-snapshot.json.txt',
  'assets/stack/auth.ts.txt',
  'assets/stack/billing-mode.ts.txt',
  'assets/stack/billing-schema.ts.txt',
  'assets/stack/entitlement-guard.ts.txt',
  'assets/stack/entitlements.ts.txt',
  'assets/stack/security.ts.txt',
  'assets/stack/storage.ts.txt',
  'assets/stack/stripe.ts.txt',
];

const publicContractAssets = [
  'assets/contracts/deployment-provenance.json',
  'assets/contracts/LICENSE',
  'assets/contracts/environment-provenance.json',
  'assets/contracts/operations-provenance.json',
  'assets/contracts/LICENSE.environment',
  'assets/contracts/LICENSE.operations',
];
const handoffFiles = [
  'assets/handoffs/handoff.mjs',
  'assets/handoffs/mcp.mjs',
  'assets/handoffs/codex/.mcp.json',
  'assets/handoffs/claude/.mcp.json',
  'assets/handoffs/pi/index.ts',
  'assets/handoffs/.agents/plugins/marketplace.json',
  'assets/handoffs/codex/.codex-plugin/plugin.json',
  'assets/handoffs/codex/hooks/hooks.json',
  'assets/handoffs/claude/.claude-plugin/plugin.json',
  'assets/handoffs/claude/hooks/hooks.json',
];
const requiredFiles = new Set([
  ...handoffFiles,
  ...publicContractAssets,
  'assets/security/credential-patterns.mjs',
  'assets/security/credential-patterns.d.mts',
  'dist/contracts/deployment.js',
  'dist/contracts/deployment.d.ts',
  ...stackFiles,
  'assets/launch/oj/run.mjs',
  'assets/launch/oj/runtime.json',
  'assets/launch/oj/OJ.LICENSE',
  ...[
    'minimal-server.ts.txt',
    'minimal-application.server.ts.txt',
    'request-context.ts.txt',
    'README.md.txt',
    'AGENTS.md.txt',
    'router.tsx.txt',
    'vite.config.ts.txt',
    'backend-vite.config.ts.txt',
    'root.tsx.txt',
    'home.tsx.txt',
    'storage-page.tsx.txt',
    'application.test.mjs.txt',
    'server.ts.txt',
    'auth-client.ts.txt',
    'sign-in.tsx.txt',
    'application.server.ts.txt',
    'styles.css.txt',
    'styling-tokens.cjs',
  ].map((name) => `assets/launch/${name}`),
  'dist/launch.js',
  'dist/scaffold/tanstack.js',
  'docs/capabilities.md',
  'dist/composition/command.js',
  'dist/composition/recipes.js',
  'dist/composition/editor.js',
  'dist/composition/references.js',
  'LICENSE',
  'README.md',
  'assets/patches/braces@3.0.3.patch',
  'assets/patches/LICENSE.braces',
  'assets/patches/node-forge@1.4.0.patch',
  'assets/patches/LICENSE.node-forge',
  'assets/patches/audit-deps.mjs',
  'assets/ui/web/button.tsx',
  'assets/ui/web/input.tsx',
  'assets/ui/web/label.tsx',
  'assets/ui/LICENSE.shadcn',
  'assets/ui/UPSTREAM.json',
  'docs/ui.md',
  'dist/bin.js',
  'dist/index.d.ts',
  'dist/index.js',
  'package.json',
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

  assertPublishedModules(files);
  for (const requiredFile of requiredFiles) {
    assert.ok(files.includes(requiredFile), `packlist should contain ${requiredFile}`);
  }

  for (const retired of [
    'docs/native-ui.md',
    'docs/anhedral-stack.md',
    'docs/assets/anhedral-stack.png',
    'docs/assets/anhedral-stack-light.png',
  ])
    assert.ok(!files.includes(retired), `retired discovery must not be packaged: ${retired}`);

  const readme = readFileSync(path.join(repoRoot, 'README.md'), 'utf8');
  assert.match(readme, /Apache-2\.0/);
  assert.match(readme, /Generated applications are editable source/);
  assert.doesNotMatch(readme, /does not grant permission to install|separate written agreement/i);
  assert.ok(
    readme.includes(
      `https://github.com/anhedral/anhedral-cli/tree/v${packageJson.version}/examples`,
    ),
  );
  assertPackedMarkdownLinks('README.md', readme, files);
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
    const allowedWebUI =
      /^assets\/ui\/(?:web\/(?:button|input|label)\.tsx|LICENSE\.shadcn|UPSTREAM(?:-LOCK)?\.json)$/.test(
        file.path,
      );
    const allowedDist = file.path.startsWith('dist/') && /\.(?:d\.ts|js)$/.test(file.path);
    const allowedDocumentation =
      file.path === 'docs/ui.md' ||
      file.path === 'docs/capabilities.md' ||
      file.path === 'docs/assets/anhedral-stack.svg' ||
      file.path === 'docs/assets/anhedral-stack-light.svg' ||
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
      publicContractAssets.includes(file.path) ||
      handoffFiles.includes(file.path) ||
      [
        'assets/security/credential-patterns.mjs',
        'assets/security/credential-patterns.d.mts',
      ].includes(file.path) ||
      allowedWebUI ||
      stackFiles.includes(file.path) ||
      (file.path.startsWith('assets/launch/') && requiredFiles.has(file.path)) ||
      allowedDist ||
      allowedDocumentation ||
      allowedPatch;
    assert.ok(allowed, `unexpected published path: ${file.path}`);
    if (!allowedDocumentation)
      assert.doesNotMatch(
        file.path,
        /(^|\/)(?:\.env|src|tests?|scripts?|\.github|node_modules|\.git)(?:\/|$)/,
      );
    assert.doesNotMatch(file.path, /\.(?:map|tgz|tsbuildinfo)$/);
  }

  const publicDeployment = readFileSync(
    path.join(repoRoot, 'dist/contracts/deployment.js'),
    'utf8',
  );
  assert.doesNotMatch(publicDeployment, /hostingPolicySchema|hostingCompatibility/);
  const publicTransport = readFileSync(
    path.join(repoRoot, 'dist/contracts/cli-transport.js'),
    'utf8',
  );
  assert.doesNotMatch(
    publicTransport,
    /cliBuildPolicySchema|cliBuildEvidenceSchema|workspaceMiB|rootFilesystem/,
  );
  const provenance = JSON.parse(
    readFileSync(path.join(repoRoot, 'assets/contracts/deployment-provenance.json')),
  );
  assert.deepEqual(Object.keys(provenance).sort(), [
    'contractVersion',
    'files',
    'license',
    'owner',
    'sourceRevision',
  ]);
  assert.equal(provenance.owner, 'anhedral/platform-contracts/deployment');
  assert.equal(provenance.license, 'Apache-2.0');
  for (const file of files.filter((name) => name.endsWith('.md'))) {
    assert.doesNotMatch(
      readFileSync(path.join(repoRoot, file), 'utf8'),
      /refs\/archive\/|repository\.bundle|\$HOME\/Documents\/Codex\//,
    );
  }

  const binEntry = packed.files.find((file) => file.path === 'dist/bin.js');
  assert.ok(binEntry, 'packlist should describe dist/bin.js');
  assert.notEqual(binEntry.mode & 0o111, 0, 'dist/bin.js should be executable');

  console.log(`Packlist policy passed: ${files.length} files, ${packed.size} packed bytes`);
} finally {
  rmSync(npmCache, { recursive: true, force: true });
}
