import { existsSync, realpathSync, statSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { commandArguments, commandArgumentError } from '../cli-arguments.js';
import { createReporter, type OutputOptions } from '../cli-output.js';
import {
  ANHEDRAL_STACK,
  PUBLIC_STACK_ADDITIONS,
  publicGroups,
  type PublicStackAddition,
  CAPABILITIES,
  CAPABILITY_IDS,
  capabilityOrder,
  installedCapability,
  publicId,
  type Capability,
} from './catalog.js';
import { CapabilityEditor } from './editor.js';
import { pinGeneratedDependencies } from '../scaffold/resolve-dependencies.js';
import { installRecipes } from './recipes.js';
import { normalizeOjFoundation } from '../scaffold/tanstack.js';
import { GENERATOR_VERSION } from '../version.js';
import {
  PostCommitError,
  runStagedTransaction,
  recoverInterruptedTransaction,
} from '../transactions/transaction.js';
import { put } from '../scaffold/files.js';
import { execFile } from '../util.js';
import { configureDependencyPatches } from '../dependency-patches.js';
import { usesD1 } from './catalog.js';
import { composeSourceProvenance, newerSourceMessage } from './composition.js';
import type { CommandRunner } from '../command-types.js';
export function projectRoot(cwd: string, allowRecovery = false) {
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
export function readState(e: CapabilityEditor) {
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
  if (project.composition?.foundation === 'tanstack-start') {
    if (!installed.includes('web')) installed.push('web');
    if (installed.includes('database-auth') && !installed.includes('db')) installed.push('db');
  }
  for (const id of installed)
    for (const parent of CAPABILITIES[id].requires)
      if (!installed.includes(parent))
        throw Error(`Invalid capability state: ${id} requires ${parent}.`);
  return { installed, managedFiles: state.managedFiles as Record<string, string> };
}
function publicScopeError(command: 'add' | 'stack' = 'add') {
  return commandArgumentError(command, 'This command requires an Anhedral Stack workspace.');
}
/** Identify the source before any recovery or source mutation. One missing manifest can be an interrupted add. */
export function assertPublicWorkspace(
  root: string,
  allowRecovery = false,
  command: 'add' | 'stack' = 'add',
) {
  const editor = new CapabilityEditor(root, {});
  const recovering = allowRecovery && existsSync(path.join(root, '.anhedral-journal.json'));
  if (!existsSync(path.join(root, 'anhedral.json'))) {
    if (
      recovering &&
      existsSync(path.join(root, 'pnpm-workspace.yaml')) &&
      (existsSync(path.join(root, 'turbo.json')) ||
        existsSync(path.join(root, 'apps/web/package.json')))
    )
      return;
    throw publicScopeError(command);
  }
  const project = editor.json('anhedral.json');
  if (
    project.capabilities?.installed?.some(
      (id: unknown) => typeof id !== 'string' || !Object.hasOwn(CAPABILITIES, id),
    )
  )
    throw publicScopeError(command);
  const legacy =
    project.composition?.contractVersion === 2 &&
    project.composition.foundation === 'tanstack-start';
  const workspace =
    project.composition?.contractVersion === 3 && project.composition.foundation === 'turborepo';
  if (project.setup?.stack !== 'anhedral-stack' || (!legacy && !workspace))
    throw publicScopeError(command);
  if (
    (legacy || project.capabilities?.installed?.includes('web')) &&
    (!recovering || existsSync(path.join(root, 'apps/web/package.json')))
  ) {
    const deps = editor.json('apps/web/package.json').dependencies;
    if (!deps?.['@tanstack/react-start'] || deps.next) throw publicScopeError(command);
  }
}
function connections(installed: Capability[]) {
  const clients = installed.filter((id) =>
    ['cli', 'mobile', 'desktop', 'web-extension', 'web'].includes(id),
  );
  const services = installed.filter((id) =>
    ['hono', 'database-auth', 'r2', 'stripe', 'in-app-purchases', 'client-sync', 'rtc'].includes(
      id,
    ),
  );
  return clients.flatMap((client) =>
    services
      .filter((service) => {
        if (service === 'rtc') return client === 'mobile' || client === 'web';
        if (service === 'in-app-purchases') return client === 'mobile';
        return true;
      })
      .map((service) => ({ client: publicId(client), service: publicId(service) })),
  );
}
function publicStackState(root: string, state: ReturnType<typeof readState>) {
  const editor = new CapabilityEditor(root, {});
  const additions = PUBLIC_STACK_ADDITIONS.filter((id) => id !== 'backend').map((id) => {
    const item = ANHEDRAL_STACK.additions[id];
    const group = publicGroups[id];
    const present = group.filter((capability) => state.installed.includes(capability));
    const installed = present.length === group.length;
    const profile = installed ? installedCapability(editor, group[0]) : item;
    const missingFiles = present.length
      ? profile.targets.filter((file) => !existsSync(path.join(root, file)))
      : [];
    const missingPrerequisites = item.requires.filter(
      (required) =>
        !publicGroups[required as PublicStackAddition].every((capability) =>
          state.installed.includes(capability),
        ),
    );
    return {
      id,
      name: profile.name,
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
    connections: connections(state.installed),
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
  run: CommandRunner = execFile,
) {
  const parsed = commandArguments(command, args);
  if (command === 'add') {
    const replacements = new Map([
      ['r2', 'storage'],
      ['stripe', 'payment'],
      ['payments', 'payment'],
    ]);
    for (const id of parsed.positional) {
      const replacement = replacements.get(id);
      if (replacement)
        throw commandArgumentError(
          'add',
          `Use anhedral add ${replacement} instead of anhedral add ${id}.`,
        );
      if (!PUBLIC_STACK_ADDITIONS.includes(id as PublicStackAddition))
        throw commandArgumentError(
          'add',
          `Choose an Anhedral Stack addition: ${PUBLIC_STACK_ADDITIONS.join(', ')}.`,
        );
    }
  }
  let result: Record<string, unknown>;
  if (command === 'stack') {
    const [action, ...extra] = parsed.positional;
    if (extra.length || !['list', 'status', 'doctor'].includes(action))
      throw commandArgumentError('stack', 'Use stack list, status or doctor.');
    if (action === 'list') result = { stack: ANHEDRAL_STACK, resourcesProvisionedByCli: false };
    else {
      const root = projectRoot(process.cwd());
      assertPublicWorkspace(root, false, 'stack');
      const e = new CapabilityEditor(root, {});
      const state = readState(e);
      result = publicStackState(root, state);
      if (action === 'doctor' && !result.sourceReady) process.exitCode = 1;
    }
  } else {
    if (!parsed.positional.length || parsed.positional.length > PUBLIC_STACK_ADDITIONS.length)
      throw commandArgumentError(
        'add',
        'Choose one or more capabilities from anhedral stack list.',
      );
    const root = projectRoot(process.cwd(), !parsed.has('--dry-run'));
    assertPublicWorkspace(root, !parsed.has('--dry-run'));
    if (!parsed.has('--dry-run') && existsSync(path.join(root, '.anhedral-journal.json'))) {
      recoverInterruptedTransaction(root);
      assertPublicWorkspace(root);
    }
    const e = new CapabilityEditor(root, {});
    const state = readState(e);
    Object.assign(e.managed, state.managedFiles);
    const manifest = e.json('package.json');
    if (typeof manifest.name !== 'string' || !manifest.name)
      throw Error('The workspace needs a package name.');
    for (const id of state.installed)
      for (const target of installedCapability(e, id).targets)
        if (!existsSync(path.join(root, target)))
          throw Error(
            `Installed capability is incomplete: ${id} (${target}). Reconcile its source first.`,
          );
    const requested = [
      ...new Set(parsed.positional.flatMap((id) => publicGroups[id as PublicStackAddition])),
    ];
    const additions = capabilityOrder(
      requested,
      state.installed,
      parsed.has('--with-dependencies'),
    );
    const installed = capabilityOrder(
      CAPABILITY_IDS.filter((id) => state.installed.includes(id) || additions.includes(id)),
      [],
      true,
    );
    const beforeConfiguration = e.json('anhedral.json');
    const newer = newerSourceMessage(beforeConfiguration.composition?.generatorVersion);
    if (newer) throw commandArgumentError('add', newer);
    const metadataChanged =
      beforeConfiguration.setup?.cliVersion !== GENERATOR_VERSION ||
      beforeConfiguration.composition?.generatorVersion !== GENERATOR_VERSION;
    const foundationChanged =
      state.installed.includes('web') && normalizeOjFoundation(e, state.installed, metadataChanged);
    const composition = composeSourceProvenance(
      e.json('anhedral.json').composition,
      installed,
      additions,
      usesD1(e),
    );
    installRecipes(e, manifest.name, state.installed, additions, installed);
    if (additions.length || foundationChanged || metadataChanged) {
      e.set('anhedral.json', ['setup', 'cliVersion'], GENERATOR_VERSION);
      e.set('anhedral.json', ['composition'], composition);
      e.set('anhedral.json', ['capabilities'], {
        schemaVersion: 1,
        installed,
        managedFiles: e.managed,
        resourcesProvisionedByCli: false,
      });
    }
    if (!parsed.has('--catalog-pins') && !parsed.has('--dry-run'))
      await pinGeneratedDependencies(e);
    const files = [...e.writes.keys()];
    const plan = {
      root,
      requested: parsed.positional,
      prerequisites: additions.filter((id) => !requested.includes(id)).map(publicId),
      connections: connections(installed).filter(
        (pair) =>
          !connections(state.installed).some(
            (old) => old.client === pair.client && old.service === pair.service,
          ),
      ),
      added: PUBLIC_STACK_ADDITIONS.filter(
        (id) =>
          id !== 'backend' && publicGroups[id].some((capability) => additions.includes(capability)),
      ),
      alreadyInstalled: parsed.positional.filter((id) =>
        publicGroups[id as PublicStackAddition].every((capability) =>
          state.installed.includes(capability),
        ),
      ),
      installed: PUBLIC_STACK_ADDITIONS.filter(
        (id) =>
          id !== 'backend' &&
          publicGroups[id].every((capability) => installed.includes(capability)),
      ),
      files,
      configuration: PUBLIC_STACK_ADDITIONS.filter(
        (id) =>
          id !== 'backend' && publicGroups[id].some((capability) => additions.includes(capability)),
      ).map((id) => ({
        id,
        requirements: [
          ...new Set(
            publicGroups[id].flatMap((capability) => [...CAPABILITIES[capability].configuration]),
          ),
        ],
      })),
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
      return `${parsed.has('--dry-run') ? 'Plan' : 'Source additions'}: ${(result.added as string[]).join(', ') || 'already installed'}\n${(result.connections as { client: string; service: string }[]).map((pair) => 'Connect ' + pair.client + ' → ' + pair.service + '\n').join('')}${(result.files as string[]).map((file) => '  ' + file).join('\n')}\nReview capability configuration and migrations before deployment. No resources were provisioned.${!parsed.has('--dry-run') && parsed.positional.includes('payment') ? '\nRun pnpm db:generate, review the billing SQL, then run pnpm db:migrate --local before testing webhooks.' : ''}`;
    else {
      const rows =
        parsed.positional[0] === 'list'
          ? PUBLIC_STACK_ADDITIONS.map((id) => `${id}\t${ANHEDRAL_STACK.additions[id].name}`)
          : (
              result.additions as {
                id: string;
                sourceState: string;
              }[]
            ).map((item) => `${item.id}\t${item.sourceState}`);
      return `${ANHEDRAL_STACK.name}\n${ANHEDRAL_STACK.foundation.name}\n${rows.join('\n')}\nSource state is not live provider activation.`;
    }
  };
  createReporter(output, format).result(result);
}
