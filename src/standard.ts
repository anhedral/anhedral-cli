import { writeProjectSection } from './project-config.js';
import { configureDependencyPatches } from './dependency-patches.js';
import { randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readdirSync, realpathSync, rmdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { execFile } from './util.js';
import { runStagedTransaction } from './transaction.js';
import { createSetupPlan } from './capabilities.js';
import { bootstrapWorkspace, assertWorkspaceRuntime } from './scaffold/bootstrap.js';
import { composeStack } from './scaffold/compose.js';
import { parseStandardOptions } from './registry/options.js';
import { STANDARD_USAGE } from './registry/usage.js';
import type { StandardOptions, StandardRunner } from './registry/types.js';
import { printProgress, printResult, type OutputOptions } from './cli-output.js';
export { parseStandardOptions, STANDARD_USAGE };
export { STANDARD_PRODUCTS } from './stack-registry.js';
export type { StandardOptions, StandardProduct, StandardRunner } from './registry/types.js';

export async function scaffoldStandardProject(
  options: StandardOptions,
  run: StandardRunner = execFile,
  output: OutputOptions = {},
): Promise<void> {
  const plan = createSetupPlan(options);
  const display = { ...output, json: options.json };
  if (options.dryRun) {
    printResult('init', plan, { ...output, json: options.json });
    return;
  }
  assertWorkspaceRuntime(run);
  const root = options.root;
  const previousQuiet = process.env.ANHEDRAL_QUIET;
  if (options.json) process.env.ANHEDRAL_QUIET = '1';
  let created = false;
  try {
    if (!existsSync(root)) {
      mkdirSync(root, { recursive: true });
      created = true;
    }
    if (lstatSync(root).isSymbolicLink() || !lstatSync(root).isDirectory())
      throw new Error('Destination must be a real directory.');
    const unexpected = readdirSync(root).filter((name) => !['.git', '.gitignore'].includes(name));
    if (unexpected.length)
      throw new Error(`Destination must be empty (apart from .git/.gitignore): ${unexpected[0]}`);
    const commitPaths: string[] = [];
    await runStagedTransaction(root, {
      commitPaths,
      seedPaths: existsSync(path.join(root, '.gitignore')) ? ['.gitignore'] : [],
      prepare: () => {
        const entries = readdirSync(root).filter(
          (name) => !['.git', '.gitignore', '.anhedral.lock', '.anhedral-txn'].includes(name),
        );
        if (entries.length) throw new Error('Destination changed before generation.');
      },
      build: async (stageRoot) => {
        printProgress('Creating the Next.js and Anhedral UI workspace…', display);
        bootstrapWorkspace(stageRoot, options.name, run);
        printProgress('Composing the selected stack…', display);
        await composeStack(stageRoot, options, plan.registry);
        writeProjectSection(stageRoot, 'identity', {
          schemaVersion: 1,
          id: randomUUID(),
        });
        if (!options.skipInstall) {
          printProgress('Resolving pinned dependencies…', display);
          run('pnpm', ['install', '--lockfile-only', '--no-frozen-lockfile'], stageRoot);
          if (configureDependencyPatches(stageRoot))
            run('pnpm', ['install', '--lockfile-only', '--no-frozen-lockfile'], stageRoot);
        }
        commitPaths.push(...readdirSync(stageRoot).filter((name) => name !== 'node_modules'));
      },
      afterCommit: () => {
        if (options.initializeGit) {
          const checkout = spawnSync('git', ['rev-parse', '--show-toplevel'], {
            cwd: root,
            encoding: 'utf8',
          });
          if (checkout.status !== 0 || realpathSync(checkout.stdout.trim()) !== realpathSync(root))
            run('git', ['init'], root);
        }
        if (!options.skipInstall) {
          printProgress('Installing workspace dependencies…', display);
          run('pnpm', ['install', '--frozen-lockfile'], root);
        }
      },
    });
    printResult(
      'init',
      {
        ...plan,
        generated: true,
      },
      { ...output, json: options.json },
    );
  } finally {
    if (created && existsSync(root) && readdirSync(root).length === 0) rmdirSync(root);
    if (previousQuiet === undefined) delete process.env.ANHEDRAL_QUIET;
    else process.env.ANHEDRAL_QUIET = previousQuiet;
  }
}
