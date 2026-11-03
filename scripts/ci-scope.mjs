import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep the exception narrow: plugin instructions, examples and registry data
// can change shipped behavior even when their filenames look like documentation.
const ordinaryDocuments = new Set([
  'README.md',
  'CONTRIBUTING.md',
  '.github/CONTRIBUTING.md',
  '.github/PULL_REQUEST_TEMPLATE.md',
]);

export function needsFullCI(files) {
  return (
    files.length === 0 ||
    files.some((file) => !ordinaryDocuments.has(file) && !/^docs\/[^\r\n]+\.md$/.test(file))
  );
}

// Compile the current public stack whenever its generator, shared source recipes,
// contracts, UI or the proof itself changes. Retired Next/native-only templates
// keep their source checks and manual proofs without another required build.
export function needsStackRuntime(files) {
  const exact = new Set([
    'src/launch.ts',
    'src/platforms/tanstack.ts',
    'src/platforms/web.ts',
    'src/platforms/lint.ts',
    'src/index.ts',
    'src/render.ts',
    'src/version.ts',
    'src/registry/options.ts',
    'src/bin.ts',
    'src/command.ts',
    'src/cli-commands.ts',
    'src/cli-arguments.ts',
    'src/command-schema.ts',
    'src/composition.ts',
    'src/dependencies.ts',
    'src/dependency-patches.ts',
    'src/dependency-order.ts',
    'src/pnpm-policy.ts',
    'src/util.ts',
    'src/bounded-file.ts',
    'src/ui-command.ts',
    'src/ui-project.ts',
    'src/ui-catalog.ts',
    'scripts/generated-auth-runtime-proof.mjs',
    'scripts/runtime-proof-receipt.mjs',
    'scripts/tanstack-runtime-smoke.mjs',
    'scripts/measure-worker.mjs',
    'scripts/ci-scope.mjs',
    'scripts/prepare-cli.mjs',
    'scripts/public-package-policy.json',
    'package.json',
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    '.github/workflows/ci.yml',
  ]);
  return (
    files.length === 0 ||
    files.some(
      (file) =>
        exact.has(file) ||
        /^(?:src\/(?:capability-[^/]+\.ts$|transaction(?:-lock)?\.ts$|scaffold\/|contracts\/)|assets\/(?:launch\/|contracts\/|patches\/|security\/|stack\/(?:api-|auth|web-|security|storage|stripe|billing-|entitlement)|ui\/(?:web\/|extensions\/|catalog\.json$|UPSTREAM\.json$))|tests\/(?:support\/|test-(?:launch-init|public-stack|ui-stack|tanstack-platform|deployment-contract|worker-measurement|runtime-proof-receipt|ci-scope)\.test\.mjs$))/.test(
          file,
        ),
    )
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const event = process.env.GITHUB_EVENT_NAME;
  const target = process.env.CI_TARGET_BRANCH;
  if (event === 'pull_request' && target === 'main' && process.env.CI_HEAD_BRANCH !== 'staging') {
    throw new Error('Main accepts release PRs from staging. Retarget this change to staging.');
  }
  const release = event === 'workflow_dispatch' || target === 'main';
  const base = process.env.CI_BASE_SHA;
  const comparable = /^[a-f0-9]{40}$/.test(base ?? '') && !/^0+$/.test(base);
  let full = true;
  let stackRuntime = true;
  if (['push', 'pull_request'].includes(process.env.GITHUB_EVENT_NAME) && comparable) {
    // Disable rename detection so moving executable source into docs cannot
    // hide the deleted source path. NUL delimiters preserve unusual filenames.
    const files = execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', base, 'HEAD'], {
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean);
    full = needsFullCI(files);
    stackRuntime = needsStackRuntime(files);
    if (!full) execFileSync('git', ['diff', '--check', base, 'HEAD'], { stdio: 'inherit' });
  }
  appendFileSync(
    process.env.GITHUB_OUTPUT,
    `full=${full}\nrelease=${release}\nstackRuntime=${stackRuntime}\n`,
  );
  console.log(
    full
      ? 'Code change: run lightweight checks.'
      : 'Documentation-only change: whitespace check passed.',
  );
}
