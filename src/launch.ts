import { existsSync, lstatSync, mkdirSync, readdirSync, realpathSync, rmdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { scaffoldTanstack } from './platforms/tanstack.js';
import { bootstrapWorkspace, assertWorkspaceRuntime } from './scaffold/bootstrap.js';
import { scaffoldStyling } from './scaffold/styling.js';
import { json, put, sharedPackage } from './scaffold/files.js';
import { CapabilityEditor } from './capability-editor.js';
import { addCapabilityRecipe, composeCapabilities } from './capability-recipes.js';
import { launchCompositionSchema } from './composition.js';
import type { Capability } from './capability-catalog.js';
import { runStagedTransaction } from './transaction.js';
import { configureDependencyPatches, writeDependencyAudit } from './dependency-patches.js';
import { setPnpmPolicy } from './pnpm-policy.js';
import { GENERATOR_VERSION } from './version.js';
import { PACKAGE_MANAGER, STACK_DEPENDENCIES, WORKSPACE_NODE_ENGINE } from './dependencies.js';
import { execFile, appendGitignore } from './util.js';
import { printProgress, printResult, type OutputOptions } from './cli-output.js';
import { CliArgumentError, commandArguments } from './cli-arguments.js';
import { packageNameFromText } from './render.js';
import type { CommandRunner } from './command-types.js';

export interface LaunchOptions {
  root: string;
  name: string;
  skipInstall: boolean;
  dryRun: boolean;
  json: boolean;
  initializeGit: boolean;
}
export function parseAnhedralStackOptions(args: readonly string[]): LaunchOptions {
  const parsed = commandArguments('init', args);
  const hasDirectory = parsed.positional.length > 0;
  const directory = hasDirectory ? parsed.positional[0] : process.cwd();
  if (!directory)
    throw new CliArgumentError(
      'Specify a valid initialization directory.',
      'Run anhedral init --help.',
    );
  const root = path.resolve(directory);
  return {
    root,
    name: packageNameFromText(path.basename(root)),
    skipInstall: parsed.has('--skip-install'),
    dryRun: parsed.has('--dry-run'),
    json: parsed.has('--json'),
    initializeGit: parsed.has('--git') || (!parsed.has('--no-git') && hasDirectory),
  };
}
const launchCapabilities: Capability[] = [];

function rootFiles(root: string, name: string) {
  json(root, 'package.json', {
    name,
    private: true,
    packageManager: PACKAGE_MANAGER,
    engines: { node: WORKSPACE_NODE_ENGINE },
    scripts: {
      dev: 'pnpm --filter @workspace/web dev',
      build: 'turbo build --concurrency=1',
      lint: 'turbo lint',
      typecheck: 'turbo typecheck',
      test: 'turbo test',
      check: 'pnpm lint && pnpm typecheck && pnpm test && pnpm build',
      'audit:deps': 'node scripts/audit-deps.mjs',
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
    composition: launchCompositionSchema.parse({
      contractVersion: 2,
      foundation: 'tanstack-start',
      generatorVersion: GENERATOR_VERSION,
      identity: 'none',
      capabilities: Object.fromEntries(launchCapabilities.map((id) => [id, GENERATOR_VERSION])),
    }),
  });
  appendGitignore(
    root,
    'node_modules/\ndist/\n.turbo/\n.wrangler/\n.tanstack/\n.oj-cache/\n*.tsbuildinfo\nworker-configuration.d.ts\n.dev.vars\n.dev.vars.*\n!.dev.vars.example\n.env\n.env.*\n!.env.example\n.anhedral/\n'
      .trim()
      .split('\n'),
  );
  writeDependencyAudit(root);
}

function documentation(root: string, name: string) {
  put(
    root,
    'README.md',
    `# ${name}

Anhedral Stack: web UI powered by OJ and TanStack Start server rendering/server functions
and editable shadcn components.
Only the web application is created initially. No backend or provider is provisioned.

## Develop

Use the Node/pnpm versions in package.json. Run pnpm install if generation skipped
installation, then pnpm dev and open http://localhost:3000. Run pnpm check and
pnpm audit:deps before deployment. Editable routes live in apps/web/src/routes.
Use cd apps/web && pnpm dlx shadcn@4.22.1 add card for more shadcn components.
Shadcn is the default, not a restriction: use any UI library and preserve local edits.
Keep LICENSE.shadcn with the copied starter components.

## Add services progressively

Run anhedral add backend to add Hono, Drizzle/D1 and Better Auth together.
Then run anhedral add r2 for private storage, or anhedral add stripe for payments.
Missing prerequisites stop before writes; --with-dependencies opts into them.
The public additions are backend, r2 and stripe; this application is web-only.

After adding backend, copy apps/api/.dev.vars.example to apps/api/.dev.vars.
Set PUBLIC_APP_URL=http://localhost:3000 and generate BETTER_AUTH_SECRET with
\`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"\`.
Auth methods start disabled. Deliberately enable chosen methods in
apps/api/src/auth-features.ts after configuring email/credentials and policies.
Run pnpm db:migrate --local explicitly to initialize the isolated local D1 database,
then pnpm dev. OJ runs the web and auxiliary API Workers with shared local
persistence. Remote bindings are disabled for local development.

R2 routes enforce authenticated owner access. Stripe adds schema and source only:
run pnpm db:generate, review the SQL, then deliberately apply the local migration
before exercising subscription/webhook flows. Configure Stripe test credentials,
allowed prices and signed webhooks; activation and live payments are separate.

## Ownership and deployment

Hono owns data, identity and private storage. Web server functions call its scoped
service binding, never import another application's source or provider credentials.
Custom API routes belong in apps/api/src/index.ts; schema/migrations in packages/db.
Composition adapters are fingerprinted and customized files are never overwritten.

Builds/startup never migrate databases. Provision D1/R2 only when selected and
configure environment-specific resources/secrets separately. pnpm build emits web
Worker artifacts under apps/web/dist and selected API artifacts under apps/api/dist. Anhedral Platform admission
requires its separately reviewed Anhedral Stack runtime/artifact; generation is not activation.
`,
  );
  put(
    root,
    'AGENTS.md',
    `# Anhedral Stack application

Use the single Anhedral Stack, starting with TanStack Start and source-owned shadcn UI. Add backend for Hono,
Drizzle/D1 and Better Auth together. Add r2 and stripe only when required. Mobile,
extensions and desktop are outside launch scope.

Edit web product routes in apps/web/src/routes, API routes in apps/api/src/index.ts,
and database schema in packages/db/src. Preserve customized composition adapters,
semantic UI tokens and attribution. No cross-application source imports.
Web server functions receive scoped API bindings through request context; keep
identity, database/storage access and secrets inside Hono. Auth methods require
explicit activation. Run pnpm check and pnpm audit:deps. Never migrate a configured
database in builds/tests/startup; apply reviewed SQL deliberately to isolated fixtures.
`,
  );
}

export function launchPlan(options: LaunchOptions) {
  return {
    schemaVersion: 1,
    cliVersion: GENERATOR_VERSION,
    root: options.root,
    name: options.name,
    products: ['tanstack-start', ...launchCapabilities],
    stack: 'anhedral-stack',
    foundation: 'tanstack-start',
    capabilities: [...launchCapabilities],
    targets: ['apps/web'],
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
        bootstrapWorkspace(stage, options.name, run);
        rootFiles(stage, options.name);
        sharedPackage(
          stage,
          'styling',
          "export { light, dark, spacing } from './tokens.cjs';\n",
          {},
        );
        scaffoldStyling({ root: stage });
        scaffoldTanstack(stage, options.name);
        const editor = new CapabilityEditor(stage, {});
        const installed: Capability[] = [];
        for (const capability of installed) addCapabilityRecipe(editor, capability, options.name);
        composeCapabilities(editor, installed);
        editor.set('anhedral.json', ['capabilities'], {
          schemaVersion: 1,
          installed,
          managedFiles: editor.managed,
          resourcesProvisionedByCli: false,
        });
        for (const [file, source] of editor.writes) put(stage, file, source);
        documentation(stage, options.name);
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
