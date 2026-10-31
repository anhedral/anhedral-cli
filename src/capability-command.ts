import { existsSync, realpathSync, statSync, chmodSync } from 'node:fs';
import path from 'node:path';
import { commandArguments, commandArgumentError } from './cli-arguments.js';
import type { OutputOptions } from './cli-output.js';
import {
  CAPABILITIES,
  CAPABILITY_IDS,
  capabilityOrder,
  type Capability,
} from './capability-catalog.js';
import { CapabilityEditor } from './capability-editor.js';
import { addCapabilityRecipe, composeCapabilities } from './capability-recipes.js';
import { PostCommitError, runStagedTransaction } from './transaction.js';
import { put } from './scaffold/files.js';
import { execFile } from './util.js';
import { capabilityReferences } from './capability-references.js';
import { configureDependencyPatches } from './dependency-patches.js';
import { composeSourceProvenance } from './composition.js';
import type { StandardRunner } from './registry/types.js';

function projectRoot(cwd: string) {
  let root = realpathSync(cwd);
  for (;;) {
    if (existsSync(path.join(root, 'anhedral.json'))) return root;
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
export async function runCapabilityCommand(
  command: 'add' | 'stack',
  args: string[],
  output: OutputOptions,
  run: StandardRunner = execFile,
) {
  const parsed = commandArguments(command, args);
  let result: Record<string, unknown>;
  if (command === 'stack') {
    const [action, ...extra] = parsed.positional;
    if (extra.length || !['list', 'status', 'doctor'].includes(action))
      throw commandArgumentError('stack', 'Use stack list, status or doctor.');
    if (action === 'list')
      result = {
        capabilities: CAPABILITY_IDS.map((id) => ({ id, ...CAPABILITIES[id] })),
        provisioning: 'Separate from source installation',
      };
    else {
      const root = projectRoot(process.cwd());
      const e = new CapabilityEditor(root, {});
      const state = readState(e);
      const capabilities = CAPABILITY_IDS.map((id) => {
        const missing = CAPABILITIES[id].requires.filter(
          (parent) => !state.installed.includes(parent),
        );
        const installed = state.installed.includes(id);
        const missingFiles = installed
          ? CAPABILITIES[id].targets.filter((target) => !existsSync(path.join(root, target)))
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
        !!e.json('apps/web/package.json').dependencies?.next;
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
      if (action === 'doctor' && !sourceReady) process.exitCode = 1;
    }
  } else {
    if (!parsed.positional.length || parsed.positional.length > CAPABILITY_IDS.length)
      throw commandArgumentError(
        'add',
        'Choose one or more capabilities from anhedral stack list.',
      );
    const root = projectRoot(process.cwd());
    const e = new CapabilityEditor(root, {});
    const state = readState(e);
    Object.assign(e.managed, state.managedFiles);
    const manifest = e.json('package.json');
    if (typeof manifest.name !== 'string' || !manifest.name)
      throw Error('The workspace needs a package name.');
    if (!e.json('apps/web/package.json').dependencies?.next)
      throw Error('A Next.js foundation is required.');
    for (const id of state.installed)
      for (const target of CAPABILITIES[id].targets)
        if (!existsSync(path.join(root, target)))
          throw Error(
            `Installed capability is incomplete: ${id} (${target}). Reconcile its source first.`,
          );
    const additions = capabilityOrder(
      parsed.positional,
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
      added: additions,
      alreadyInstalled: parsed.positional.filter((id) =>
        state.installed.includes(id as Capability),
      ),
      installed,
      files,
      configuration: additions.map((id) => ({ id, requirements: CAPABILITIES[id].configuration })),
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
  if (output.json) console.log(JSON.stringify(result, null, 2));
  else if (!output.quiet) {
    if (command === 'add')
      console.log(
        `${parsed.has('--dry-run') ? 'Plan' : 'Source additions'}: ${(result.added as string[]).join(', ') || 'already installed'}\n${(result.files as string[]).map((file) => '  ' + file).join('\n')}\nReview capability configuration and migrations before deployment. No resources were provisioned.`,
      );
    else
      console.log(
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
          .join('\n') + '\nSource state is not live provider activation.',
      );
  }
}
