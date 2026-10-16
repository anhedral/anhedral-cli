import { spawnSyncPortable } from './spawn-command.mjs';
import { verifyPluginRuntime } from '../plugins/codex/inspector/source-integrity.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveCommand } from '../dist/command.js';
import { supportsWorkspaceRuntime } from '../dist/runtime-policy.js';

const runCommand = (command, args, options) => {
  const invocation = resolveCommand(command, args);
  return spawnSyncPortable(invocation.command, invocation.args, options);
};

/** Reuse CI's verified runtime, or prepare the local packaging-test prerequisite. */
export function prepareTestRuntime(root, verify = verifyPluginRuntime, run = runCommand) {
  try {
    verify(root);
    return;
  } catch {
    /* Missing or stale runtime must be rebuilt. */
  }
  if (!supportsWorkspaceRuntime(process.versions.node))
    throw new Error(
      'Preparing inspector tests requires Node 22.13+ on 22.x or Node 24+. CI on older Node must supply the verified plugin-runtime artifact.',
    );
  for (const args of [
    ['--dir', 'plugins/codex/inspector', 'install', '--frozen-lockfile'],
    ['plugin:build'],
  ]) {
    const result = run('pnpm', args, {
      cwd: root,
      stdio: 'inherit',
      timeout: 20 * 60 * 1000,
      killSignal: 'SIGKILL',
    });
    if (result.error || result.status !== 0)
      throw new Error(
        'Could not prepare the inspector test runtime. Run pnpm --dir plugins/codex/inspector install --frozen-lockfile and pnpm plugin:build.',
        result.error ? { cause: result.error } : undefined,
      );
  }
  verify(root);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  prepareTestRuntime(path.resolve(import.meta.dirname, '..'));
