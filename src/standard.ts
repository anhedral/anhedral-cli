import { recordScaffoldFiles } from './registry/receipt.js';
import { existsSync, lstatSync, mkdirSync, readdirSync, realpathSync, rmdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { execFile } from './util.js';
import { registerVercelApplication } from './vercel.js';
import { registerApplication } from './delivery.js';
import { runStagedTransaction } from './transaction.js';
import { createSetupPlan } from './capabilities.js';
import { bootstrapWorkspace } from './scaffold/bootstrap.js';
import { composeStack } from './scaffold/compose.js';
import { parseStandardOptions } from './registry/options.js';
import { STANDARD_USAGE } from './registry/usage.js';
import type { StandardOptions, StandardRunner } from './registry/types.js';
export { parseStandardOptions, STANDARD_USAGE };
export { STANDARD_PRODUCTS } from './stack-registry.js';
export type { StandardOptions, StandardProduct, StandardRunner } from './registry/types.js';

const defaultRunner: StandardRunner = (command, args, cwd) => execFile(command, args, cwd);
function assertBootstrapPlatform(run: StandardRunner): void {
  if (process.platform === 'win32' && run === defaultRunner) {
    throw new Error(
      'Native Windows initialization is blocked because the upstream shadcn monorepo bootstrap writes component files outside the project. Run Anhedral inside WSL. Planning and doctor remain available on Windows.',
    );
  }
}
export async function scaffoldStandardProject(
  options: StandardOptions,
  run: StandardRunner = defaultRunner,
): Promise<void> {
  const plan = createSetupPlan(options);
  if (options.dryRun) {
    console.log(options.json ? JSON.stringify(plan, null, 2) : JSON.stringify(plan));
    return;
  }
  assertBootstrapPlatform(run);
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
        bootstrapWorkspace(stageRoot, options.name, run);
        await composeStack(stageRoot, options, plan.registry);
        if (options.products.includes('next') && options.hosting === 'vercel')
          registerVercelApplication(stageRoot);
        if (
          readdirSync(path.join(stageRoot, 'apps')).some((app) =>
            existsSync(path.join(stageRoot, 'apps', app, 'wrangler.jsonc')),
          )
        )
          registerApplication(stageRoot);
        run('pnpm', ['install', '--lockfile-only', '--no-frozen-lockfile'], stageRoot);
        recordScaffoldFiles(stageRoot);
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
        if (!options.skipInstall) run('pnpm', ['install', '--frozen-lockfile'], root);
      },
    });
    console.log(
      options.json
        ? JSON.stringify({ ...plan, generated: true })
        : `Created ${root}. Next: cd ${JSON.stringify(root)}, then pnpm dev. Implement the product flows, configure selected resources using README.md and anhedral.setup.json, and run pnpm check. Record stack decisions in docs/architecture.md and exercised acceptance criteria in docs/verification.md.`,
    );
    if (!options.json) {
      console.log('\nHelp keep Anhedral Init free and open source.');
      console.log('Sponsor ongoing development, maintenance, and documentation.');
      console.log(
        'Become a sponsor: https://github.com/anhedral/anhedral-init/blob/main/docs/sponsorships.md',
      );
    }
  } finally {
    if (created && existsSync(root) && readdirSync(root).length === 0) rmdirSync(root);
    if (previousQuiet === undefined) delete process.env.ANHEDRAL_QUIET;
    else process.env.ANHEDRAL_QUIET = previousQuiet;
  }
}
