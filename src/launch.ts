import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readdirSync, realpathSync, rmdirSync } from 'node:fs';
import path from 'node:path';

import { CliArgumentError, commandArguments, selectsFullWorkspace } from './cli-arguments.js';
import { printProgress, printResult, type OutputOptions } from './cli-output.js';
import type { CommandRunner } from './command-types.js';
import {
  CAPABILITY_IDS,
  PUBLIC_STACK_ADDITIONS,
  capabilityOrder,
  type Capability,
} from './composition/catalog.js';
import { CapabilityEditor } from './composition/editor.js';
import { installRecipes } from './composition/recipes.js';
import { launchCompositionSchema, composeSourceProvenance } from './composition/composition.js';
import {
  PACKAGE_MANAGER,
  SECURITY_OVERRIDES,
  STACK_DEPENDENCIES,
  WORKSPACE_NODE_ENGINE,
} from './dependencies.js';
import { configureDependencyPatches, writeDependencyAudit } from './dependency-patches.js';
import { setPnpmPolicy } from './pnpm-policy.js';
import { packageNameFromText } from './render.js';
import { pinGeneratedDependencies } from './scaffold/resolve-dependencies.js';
import { assertWorkspaceRuntime } from './scaffold/bootstrap.js';
import { json, put } from './scaffold/files.js';
import { runStagedTransaction } from './transactions/transaction.js';
import { execFile, appendGitignore } from './util.js';
import { GENERATOR_VERSION } from './version.js';

export interface LaunchOptions {
  root: string;
  name: string;
  skipInstall: boolean;
  dryRun: boolean;
  json: boolean;
  initializeGit: boolean;
  all?: boolean;
  catalogPins?: boolean;
}
export function parseAnhedralStackOptions(args: readonly string[]): LaunchOptions {
  const parsed = commandArguments('init', args);
  const all = selectsFullWorkspace(args);
  const directories = all ? parsed.positional.slice(1) : parsed.positional;
  const hasDirectory = directories.length > 0;
  const directory = hasDirectory ? directories[0] : process.cwd();
  if (!directory)
    throw new CliArgumentError(
      'Specify a valid initialization directory.',
      'Run anhedral init --help.',
    );
  const root = path.resolve(directory);
  return {
    root,
    ...(all ? { all: true } : {}),
    ...(parsed.has('--catalog-pins') ? { catalogPins: true } : {}),
    name: packageNameFromText(path.basename(root)),
    skipInstall: parsed.has('--skip-install'),
    dryRun: parsed.has('--dry-run'),
    json: parsed.has('--json'),
    initializeGit: parsed.has('--git') || (!parsed.has('--no-git') && hasDirectory),
  };
}

function rootFiles(root: string, name: string) {
  json(root, 'package.json', {
    name,
    private: true,
    packageManager: PACKAGE_MANAGER,
    engines: { node: WORKSPACE_NODE_ENGINE },
    scripts: {
      build: 'turbo build --concurrency=1',
      lint: 'turbo lint',
      typecheck: 'turbo typecheck',
      test: 'turbo test',
      'audit:deps': 'node scripts/audit-deps.mjs',
      check: 'pnpm lint && pnpm typecheck && pnpm test && pnpm build',
    },
    devDependencies: { turbo: STACK_DEPENDENCIES.turbo },
  });
  json(root, 'turbo.json', {
    $schema: 'https://turborepo.com/schema.json',
    globalDependencies: ['**/.dev.vars', '**/.dev.vars.*', '**/.env', '**/.env.*'],
    tasks: {
      build: { dependsOn: ['^build'], outputs: ['dist/**'] },
      lint: { dependsOn: ['^lint'] },
      typecheck: {
        dependsOn: ['^typecheck'],
        outputs: ['worker-configuration.d.ts', 'src/routeTree.gen.ts'],
      },
      test: { dependsOn: ['^build'], outputs: ['coverage/**'] },
    },
  });
  setPnpmPolicy(root, {
    packages: ['apps/*', 'packages/*'],
    sharedWorkspaceLockfile: true,
    overrides: SECURITY_OVERRIDES,
    allowBuilds: { esbuild: true, workerd: true },
  });
  json(root, 'anhedral.json', {
    schemaVersion: 1,
    identity: { schemaVersion: 1, id: randomUUID() },
    setup: {
      schemaVersion: 1,
      cliVersion: GENERATOR_VERSION,
      stack: 'anhedral-stack',
      resourcesProvisioned: false,
    },
    standard: {
      schemaVersion: 1,
      standard: 'anhedral-stack',
      hosting: 'cloudflare',
      resourcesProvisioned: false,
    },
    capabilities: {
      schemaVersion: 1,
      installed: [],
      managedFiles: {},
      resourcesProvisionedByCli: false,
    },
    composition: launchCompositionSchema.parse({
      contractVersion: 3,
      foundation: 'turborepo',
      generatorVersion: GENERATOR_VERSION,
      identity: 'none',
      capabilities: {},
    }),
  });
  writeDependencyAudit(root);
  appendGitignore(
    root,
    'node_modules/\ndist/\n.turbo/\n.wrangler/\n.tanstack/\n.oj-cache/\n*.tsbuildinfo\nworker-configuration.d.ts\n.dev.vars\n.dev.vars.*\n!.dev.vars.example\n.env\n.env.*\n!.env.example\n.anhedral/\n'
      .trim()
      .split('\n'),
  );
}

export function renderWorkspaceTemplates(root: string, name: string, installed: Capability[]) {
  rootFiles(root, name);
  const editor = new CapabilityEditor(root, {});
  if (installed.length) installRecipes(editor, name, [], installed, installed);
  return editor;
}

export function launchPlan(options: LaunchOptions) {
  return {
    schemaVersion: 1,
    cliVersion: GENERATOR_VERSION,
    root: options.root,
    name: options.name,
    products: options.all ? ['web', 'mobile', 'desktop', 'web-extension', 'cli', 'api'] : [],
    stack: 'anhedral-stack',
    foundation: 'turborepo',
    capabilities: options.all ? PUBLIC_STACK_ADDITIONS.filter((id) => id !== 'backend') : [],
    targets: options.all
      ? ['apps/web', 'apps/mobile', 'apps/desktop', 'apps/web-extension', 'apps/cli', 'apps/api']
      : [],
    dryRun: options.dryRun,
    resourcesProvisioned: false,
    hostedAdmission: 'not evaluated',
  };
}

/** Fresh directories only; source commit and installation retain the existing recovery contract. */
export async function scaffoldLaunchProject(
  options: LaunchOptions,
  run: CommandRunner = execFile,
  output: OutputOptions = {},
): Promise<void> {
  const root = options.root;
  const info = lstatSync(root, { throwIfNoEntry: false });
  if (info && (info.isSymbolicLink() || !info.isDirectory()))
    throw Error('Destination must be a real directory.');
  const plan = launchPlan(options);
  const display = { ...output, json: options.json };
  const assertEmpty = (recovery = false) => {
    if (!existsSync(root)) return;
    const allowed = [
      '.git',
      '.gitignore',
      ...(recovery ? ['.anhedral.lock', '.anhedral-txn', '.anhedral-journal.json'] : []),
    ];
    const extra = readdirSync(root).find((name) => !allowed.includes(name));
    if (extra) throw Error(`Destination must be empty (apart from .git/.gitignore): ${extra}`);
  };
  if (options.dryRun) {
    assertEmpty();
    printResult('init', plan, display);
    return;
  }
  assertWorkspaceRuntime(run);
  const created = !info;
  if (created) mkdirSync(root, { recursive: true });
  try {
    const commitPaths: string[] = [];
    await runStagedTransaction(root, {
      commitPaths,
      seedPaths: existsSync(path.join(root, '.gitignore')) ? ['.gitignore'] : [],
      prepare: () => assertEmpty(true),
      build: async (stage) => {
        printProgress('Creating the Anhedral Stack…', display);
        const installed = options.all ? capabilityOrder(CAPABILITY_IDS, [], true) : [];
        const e = renderWorkspaceTemplates(stage, options.name, installed);
        if (options.all) {
          e.set(
            'anhedral.json',
            ['composition'],
            composeSourceProvenance(e.json('anhedral.json').composition, installed, installed),
          );
          e.set('anhedral.json', ['capabilities'], {
            schemaVersion: 1,
            installed,
            managedFiles: e.managed,
            resourcesProvisionedByCli: false,
          });
        }
        if (!options.catalogPins) await pinGeneratedDependencies(e, { initializing: true });
        for (const [file, source] of e.writes) put(stage, file, source);
        if (!options.skipInstall) {
          printProgress('Resolving Anhedral Stack dependencies…', display);
          run('pnpm', ['install', '--lockfile-only', '--no-frozen-lockfile'], stage);
          if (configureDependencyPatches(stage))
            run('pnpm', ['install', '--lockfile-only', '--no-frozen-lockfile'], stage);
        }
        commitPaths.push(...readdirSync(stage).filter((name) => name !== 'node_modules'));
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
    printResult(
      'init',
      { ...plan, generated: true, dependenciesInstalled: !options.skipInstall },
      display,
    );
  } finally {
    if (created && existsSync(root) && readdirSync(root).length === 0) rmdirSync(root);
  }
}
