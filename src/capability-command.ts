import { existsSync, realpathSync, statSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { commandArguments, commandArgumentError } from './cli-arguments.js';
import { createReporter, type OutputOptions } from './cli-output.js';
import {
  ANHEDRAL_STACK,
  PUBLIC_STACK_ADDITIONS,
  type PublicStackAddition,
  CAPABILITIES,
  CAPABILITY_IDS,
  capabilityOrder,
  type Capability,
} from './capability-catalog.js';
import { CapabilityEditor } from './capability-editor.js';
import { addCapabilityRecipe, composeCapabilities } from './capability-recipes.js';
import {
  PostCommitError,
  runStagedTransaction,
  recoverInterruptedTransaction,
} from './transaction.js';
import { put } from './scaffold/files.js';
import { execFile } from './util.js';
import { capabilityReferences } from './capability-references.js';
import { configureDependencyPatches } from './dependency-patches.js';
import { composeSourceProvenance } from './composition.js';
import type { StandardRunner } from './registry/types.js';

function projectRoot(cwd: string, allowRecovery = false) {
  let root = realpathSync(cwd);
  for (;;) {
    if (
      existsSync(path.join(root, 'anhedral.json')) ||
      (allowRecovery && existsSync(path.join(root, '.anhedral-journal.json')))
    )
      return root;
    if (existsSync(path.join(root, '.git'))) break;
    const parent = path.dirname(root);
    if (parent === root) break;
    root = parent;
  }
  throw Error('No Anhedral workspace found. Select a generated project with --cwd.');
}
function readState(e: CapabilityEditor) {
  const project = e.json('anhedral.json');
  const state = project.capabilities ?? { schemaVersion: 1, installed: [], managedFiles: {} };
  if (
    state.schemaVersion !== 1 ||
    !Array.isArray(state.installed) ||
    state.installed.some(
      (id: unknown) => typeof id !== 'string' || !Object.hasOwn(CAPABILITIES, id),
    ) ||
    !state.managedFiles ||
    typeof state.managedFiles !== 'object' ||
    Array.isArray(state.managedFiles)
  )
    throw Error('Invalid capability state; preserve and reconcile anhedral.json.');
  const installed = [...new Set(state.installed)] as Capability[];
  for (const id of installed)
    for (const parent of CAPABILITIES[id].requires)
      if (!installed.includes(parent))
        throw Error(`Invalid capability state: ${id} requires ${parent}.`);
  return { installed, managedFiles: state.managedFiles as Record<string, string> };
}
const archivedStack = 'codex/preserved-progressive-stack-20261102';
const publicGroups: Record<PublicStackAddition, readonly Capability[]> = {
  backend: ['hono', 'database-auth'],
  r2: ['r2'],
  stripe: ['stripe'],
};
function publicScopeError(command: 'add' | 'stack' = 'add') {
  return commandArgumentError(
    command,
    `The active CLI edits only the Anhedral Stack. Preserved broader source workflows are on ${archivedStack}.`,
  );
}
/** Identify the source before any recovery or source mutation. One missing manifest can be an interrupted add. */
function assertPublicWorkspace(
  root: string,
  allowRecovery = false,
  command: 'add' | 'stack' = 'add',
) {
  const editor = new CapabilityEditor(root, {});
  const recovering = allowRecovery && existsSync(path.join(root, '.anhedral-journal.json'));
  const hasWeb = existsSync(path.join(root, 'apps/web/package.json'));
  const hasConfiguration = existsSync(path.join(root, 'anhedral.json'));
  if (!hasWeb && !hasConfiguration) throw publicScopeError(command);
  if (hasWeb) {
    const dependencies = editor.json('apps/web/package.json').dependencies;
    if (!dependencies?.['@tanstack/react-start'] || dependencies.next)
      throw publicScopeError(command);
  } else if (!recovering) throw publicScopeError(command);
  if (hasConfiguration) {
    const configuration = editor.json('anhedral.json');
    const composition = configuration.composition;
    if (
      Array.isArray(configuration.capabilities?.installed) &&
      configuration.capabilities.installed.some(
        (id: string) => !['hono', 'database-auth', 'r2', 'stripe'].includes(id),
      )
    )
      throw publicScopeError(command);
    if (composition?.contractVersion !== 2 || composition?.foundation !== 'tanstack-start')
      throw publicScopeError(command);
  } else if (!recovering) throw publicScopeError(command);
}
function publicStackState(root: string, state: ReturnType<typeof readState>) {
  if (state.installed.some((id) => !['hono', 'database-auth', 'r2', 'stripe'].includes(id)))
    throw publicScopeError('stack');
  const additions = PUBLIC_STACK_ADDITIONS.map((id) => {
    const item = ANHEDRAL_STACK.additions[id];
    const group = publicGroups[id];
    const present = group.filter((capability) => state.installed.includes(capability));
    const installed = present.length === group.length;
    const missingFiles = present.length
      ? item.targets.filter((file) => !existsSync(path.join(root, file)))
      : [];
    const missingPrerequisites = item.requires.filter(
      (required) =>
        !publicGroups[required as PublicStackAddition].every((capability) =>
          state.installed.includes(capability),
        ),
    );
    return {
      id,
      name: item.name,
      sourceState: present.length
        ? installed && !missingFiles.length && !missingPrerequisites.length
          ? 'installed'
          : 'incomplete'
        : missingPrerequisites.length
          ? 'locked'
          : 'available',
      missingPrerequisites,
      missingFiles,
      activation: 'not verified',
    };
  });
  const missingFiles = ANHEDRAL_STACK.foundation.targets.filter(
    (file) => !existsSync(path.join(root, file)),
  );
  const foundationReady = !missingFiles.length;
  return {
    root,
    stack: {
      id: ANHEDRAL_STACK.id,
      name: ANHEDRAL_STACK.name,
      foundation: { ...ANHEDRAL_STACK.foundation, missingFiles },
    },
    foundationReady,
    sourceReady: foundationReady && additions.every((item) => item.sourceState !== 'incomplete'),
    additions,
    runtimeAcceptance: 'not evaluated',
    resourcesProvisionedByCli: false,
  };
}

export async function runCapabilityCommand(
  command: 'add' | 'stack',
  args: string[],
  output: OutputOptions,
  run: StandardRunner = execFile,
  scope: 'compatibility' | 'public' = 'compatibility',
) {
  const parsed = commandArguments(command, args);
  if (scope === 'public' && command === 'add') {
    const unsupported = parsed.positional.filter(
      (id) => !PUBLIC_STACK_ADDITIONS.includes(id as PublicStackAddition),
    );
    if (unsupported.length)
      throw commandArgumentError(
        'add',
        `Choose backend, r2 or stripe for the Anhedral Stack. Broader source recipes are preserved on ${archivedStack}.`,
      );
  }
  let result: Record<string, unknown>;
  if (command === 'stack') {
    const [action, ...extra] = parsed.positional;
    if (extra.length || !['list', 'status', 'doctor'].includes(action))
      throw commandArgumentError('stack', 'Use stack list, status or doctor.');
    if (action === 'list')
      result =
        scope === 'public'
          ? { stack: ANHEDRAL_STACK, resourcesProvisionedByCli: false }
          : {
              launchAdditions: {
                backend: ['hono', 'database-auth'],
                r2: ['r2'],
                stripe: ['stripe'],
              },
              capabilities: CAPABILITY_IDS.map((id) => ({ id, ...CAPABILITIES[id] })),
              provisioning: 'Separate from source installation',
            };
    else {
      const root = projectRoot(process.cwd());
      if (scope === 'public') assertPublicWorkspace(root, false, 'stack');
      const e = new CapabilityEditor(root, {});
      const state = readState(e);
      const capabilities = CAPABILITY_IDS.map((id) => {
        const missing = CAPABILITIES[id].requires.filter(
          (parent) => !state.installed.includes(parent),
        );
        const installed = state.installed.includes(id);
        const missingFiles = installed
          ? CAPABILITIES[id].targets
              .map((target) =>
                target === 'apps/web/lib/auth-client.ts' &&
                e.json('apps/web/package.json').dependencies?.['@tanstack/react-start']
                  ? 'apps/web/src/lib/auth-client.ts'
                  : target,
              )
              .filter((target) => !existsSync(path.join(root, target)))
          : [];
        return {
          id,
          name: CAPABILITIES[id].name,
          sourceState: installed
            ? missingFiles.length
              ? 'incomplete'
              : 'installed'
            : missing.length
              ? 'locked'
              : 'available',
          missingPrerequisites: missing,
          missingFiles,
          configuration: installed ? CAPABILITIES[id].configuration : [],
          activation: 'not verified',
        };
      });
      const foundationReady =
        existsSync(path.join(root, 'apps/web/package.json')) &&
        !!(
          e.json('apps/web/package.json').dependencies?.next ||
          e.json('apps/web/package.json').dependencies?.['@tanstack/react-start']
        );
      const sourceReady =
        foundationReady && capabilities.every((c) => c.sourceState !== 'incomplete');
      result = {
        root,
        foundationReady,
        sourceReady,
        capabilities,
        runtimeAcceptance: 'not evaluated',
        resourcesProvisionedByCli: false,
      };
      if (scope === 'public') result = publicStackState(root, state);
      if (action === 'doctor' && !result.sourceReady) process.exitCode = 1;
    }
  } else {
    if (!parsed.positional.length || parsed.positional.length > CAPABILITY_IDS.length)
      throw commandArgumentError(
        'add',
        'Choose one or more capabilities from anhedral stack list.',
      );
    const root = projectRoot(process.cwd(), !parsed.has('--dry-run'));
    if (scope === 'public') assertPublicWorkspace(root, !parsed.has('--dry-run'));
    if (!parsed.has('--dry-run') && existsSync(path.join(root, '.anhedral-journal.json')))
      recoverInterruptedTransaction(root);
    const e = new CapabilityEditor(root, {});
    const state = readState(e);
    if (scope === 'public') {
      assertPublicWorkspace(root);
      if (state.installed.some((id) => !['hono', 'database-auth', 'r2', 'stripe'].includes(id)))
        throw publicScopeError();
    }
    Object.assign(e.managed, state.managedFiles);
    const manifest = e.json('package.json');
    if (typeof manifest.name !== 'string' || !manifest.name)
      throw Error('The workspace needs a package name.');
    if (!(
      e.json('apps/web/package.json').dependencies?.next ||
      e.json('apps/web/package.json').dependencies?.['@tanstack/react-start']
    ))
      throw Error('An Anhedral Next.js or TanStack Start foundation is required.');
    for (const id of state.installed)
      for (const original of CAPABILITIES[id].targets) {
        const target =
          original === 'apps/web/lib/auth-client.ts' &&
          e.json('apps/web/package.json').dependencies?.['@tanstack/react-start']
            ? 'apps/web/src/lib/auth-client.ts'
            : original;
        if (!existsSync(path.join(root, target)))
          throw Error(
            `Installed capability is incomplete: ${id} (${target}). Reconcile its source first.`,
          );
      }
    if (
      scope === 'public' &&
      !parsed.has('--with-dependencies') &&
      !parsed.positional.includes('backend') &&
      !(state.installed.includes('hono') && state.installed.includes('database-auth')) &&
      parsed.positional.some((id) => id === 'r2' || id === 'stripe')
    )
      throw commandArgumentError(
        'add',
        'Private storage and payments require backend. Run anhedral add backend first, or explicitly use --with-dependencies.',
      );
    const requested = [
      ...new Set(
        parsed.positional.flatMap((id) => (id === 'backend' ? ['hono', 'database-auth'] : [id])),
      ),
    ];
    const additions = capabilityOrder(
      requested,
      state.installed,
      parsed.has('--with-dependencies'),
    );
    const installed = [...state.installed, ...additions];
    const composition = composeSourceProvenance(
      e.json('anhedral.json').composition,
      installed,
      additions,
    );
    for (const id of additions) addCapabilityRecipe(e, id, manifest.name);
    if (additions.length) {
      for (const [file, source] of Object.entries(capabilityReferences()))
        if (e.read(file) === null) e.create(file, source);
      composeCapabilities(e, installed);
      e.set('anhedral.json', ['composition'], composition);
      e.set('anhedral.json', ['capabilities'], {
        schemaVersion: 1,
        installed,
        managedFiles: e.managed,
        resourcesProvisionedByCli: false,
      });
    }
    const files = [...e.writes.keys()];
    const plan = {
      root,
      added:
        scope === 'public'
          ? PUBLIC_STACK_ADDITIONS.filter((id) =>
              publicGroups[id].some((capability) => additions.includes(capability)),
            )
          : additions,
      alreadyInstalled: parsed.positional.filter((id) =>
        id === 'backend'
          ? state.installed.includes('hono') && state.installed.includes('database-auth')
          : state.installed.includes(id as Capability),
      ),
      installed:
        scope === 'public'
          ? PUBLIC_STACK_ADDITIONS.filter((id) =>
              publicGroups[id].every((capability) => installed.includes(capability)),
            )
          : installed,
      files,
      configuration:
        scope === 'public'
          ? PUBLIC_STACK_ADDITIONS.filter((id) =>
              publicGroups[id].some((capability) => additions.includes(capability)),
            ).map((id) => ({
              id,
              requirements: [
                ...new Set(
                  publicGroups[id].flatMap((capability) => [
                    ...CAPABILITIES[capability].configuration,
                  ]),
                ),
              ],
            }))
          : additions.map((id) => ({ id, requirements: CAPABILITIES[id].configuration })),
      dryRun: parsed.has('--dry-run'),
      resourcesProvisionedByCli: false,
      activation: 'not verified',
    };
    const installDependencies = () => {
      if (parsed.has('--skip-install')) return;
      run('pnpm', ['install', '--lockfile-only', '--no-frozen-lockfile'], root);
      if (configureDependencyPatches(root))
        run('pnpm', ['install', '--lockfile-only', '--no-frozen-lockfile'], root);
      run('pnpm', ['install', '--frozen-lockfile'], root);
    };
    if (!parsed.has('--dry-run') && files.length) {
      await runStagedTransaction(root, {
        commitPaths: files,
        prepare: () => e.verify(),
        build: async (stage) => {
          for (const [file, source] of e.writes) {
            put(stage, file, source);
            if (e.before.get(file) !== null)
              chmodSync(path.join(stage, file), statSync(path.join(root, file)).mode & 0o777);
          }
          e.verify();
        },
        afterCommit: installDependencies,
      });
    }
    if (!parsed.has('--dry-run') && !files.length) {
      e.verify();
      try {
        installDependencies();
      } catch (error) {
        throw new PostCommitError([], error);
      }
    }
    result = {
      ...plan,
      sourceInstalled: !parsed.has('--dry-run'),
      dependenciesInstalled: !parsed.has('--dry-run') && !parsed.has('--skip-install'),
    };
  }
  const format = () => {
    if (command === 'add')
      return `${parsed.has('--dry-run') ? 'Plan' : 'Source additions'}: ${(result.added as string[]).join(', ') || 'already installed'}\n${(result.files as string[]).map((file) => '  ' + file).join('\n')}\nReview capability configuration and migrations before deployment. No resources were provisioned.`;
    else if (scope === 'public') {
      const rows =
        parsed.positional[0] === 'list'
          ? PUBLIC_STACK_ADDITIONS.map((id) => `${id}\t${ANHEDRAL_STACK.additions[id].name}`)
          : (result.additions as { id: string; sourceState: string }[]).map(
              (item) => `${item.id}\t${item.sourceState}`,
            );
      return `${ANHEDRAL_STACK.name}\n${ANHEDRAL_STACK.foundation.name}\n${rows.join('\n')}\nSource state is not live provider activation.`;
    } else
      return (
        (
          result.capabilities as {
            id: string;
            name: string;
            sourceState?: string;
            requires?: readonly string[];
          }[]
        )
          .map(
            (item) =>
              `${item.id}\t${item.sourceState ?? item.name}\t${item.requires?.join(', ') ?? ''}`,
          )
          .join('\n') + '\nSource state is not live provider activation.'
      );
  };
  createReporter(output, format).result(result);
}
