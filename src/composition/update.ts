import { chmodSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual, stripVTControlCharacters } from 'node:util';
import { deploymentManifestSchema } from '../contracts/deployment.js';
import {
  ArtifactUnavailableError,
  resolvePublishedCliArtifact,
  isPublishedCliArtifact,
  type PublishedCliArtifact,
} from '../release-artifact.js';
import { isMap, parseDocument } from 'yaml';
import { commandArgumentError, commandArguments } from '../cli-arguments.js';
import { CliFailure } from '../cli-errors.js';
import { createReporter, type OutputOptions } from '../cli-output.js';
import { assertPublicWorkspace, projectRoot, readState } from './command.js';
import { CapabilityEditor, fingerprint } from './editor.js';
import { composeCapabilities } from './recipes.js';
import { usesD1 } from './catalog.js';
import { composeSourceProvenance, newerSourceMessage } from './composition.js';
import { GENERATOR_VERSION } from '../version.js';
import { runStagedTransaction } from '../transactions/transaction.js';
import { planDependencyUpdate, type UpdateDependencies } from './update-lockfiles.js';
import type { DependencyPin } from '../scaffold/resolve-dependencies.js';
import { put } from '../scaffold/files.js';

const MAX_UPDATE_BYTES = 256 * 1024;
const MAX_UPDATE_FILES = 32;

/** One exact replacement hunk without unchanged project configuration context. */
export function updateDiff(file: string, before: string | null, after: string): string {
  const old = before === null || before === '' ? [] : before.split('\n');
  const next = after === '' ? [] : after.split('\n');
  if (old.at(-1) === '') old.pop();
  if (next.at(-1) === '') next.pop();
  const newlineChanged = before !== null && before.endsWith('\n') !== after.endsWith('\n');
  let prefix = 0;
  while (prefix < old.length && prefix < next.length && old[prefix] === next[prefix]) prefix++;
  if (newlineChanged && prefix === old.length && prefix === next.length && prefix > 0) prefix--;
  let suffix = 0;
  while (
    suffix < old.length - prefix &&
    suffix < next.length - prefix &&
    old[old.length - suffix - 1] === next[next.length - suffix - 1] &&
    !(newlineChanged && suffix === 0)
  )
    suffix++;
  const oldEnd = old.length - suffix;
  const nextEnd = next.length - suffix;
  const oldCount = oldEnd - prefix;
  const nextCount = nextEnd - prefix;
  const lines = [
    `--- ${before === null ? '/dev/null' : `a/${file}`}`,
    `+++ b/${file}`,
    `@@ -${oldCount ? prefix + 1 : prefix},${oldCount} +${nextCount ? prefix + 1 : prefix},${nextCount} @@`,
  ];
  for (let index = prefix; index < oldEnd; index++) {
    lines.push(`-${old[index]}`);
    if (index === old.length - 1 && before !== null && !before.endsWith('\n'))
      lines.push('\\ No newline at end of file');
  }
  for (let index = prefix; index < nextEnd; index++) {
    lines.push(`+${next[index]}`);
    if (index === next.length - 1 && !after.endsWith('\n'))
      lines.push('\\ No newline at end of file');
  }
  return lines.join('\n') + '\n';
}

function updatePnpmPolicy(e: CapabilityEditor) {
  const file = 'pnpm-workspace.yaml';
  const source = e.read(file);
  if (source === null)
    throw Error('Missing pnpm-workspace.yaml; preserve and reconcile workspace policy.');
  const document = parseDocument(source);
  if (document.errors.length || !isMap(document.contents))
    throw Error('Invalid pnpm-workspace.yaml; preserve existing policy.');
  let policy: Record<string, unknown>;
  try {
    policy = document.toJS();
  } catch {
    throw Error('Invalid or ambiguous pnpm workspace aliases; preserve existing policy.');
  }
  const expected = { esbuild: true, workerd: true };
  if (
    policy.dangerouslyAllowAllBuilds !== undefined ||
    policy.ignoredBuiltDependencies !== undefined ||
    policy.neverBuiltDependencies !== undefined ||
    policy.onlyBuiltDependenciesFile !== undefined
  )
    throw Error('Customized pnpm build policy requires review; no source was changed.');
  const previous = policy.onlyBuiltDependencies;
  if (
    previous !== undefined &&
    (!Array.isArray(previous) ||
      previous.length !== 2 ||
      new Set(previous).size !== 2 ||
      !previous.includes('esbuild') ||
      !previous.includes('workerd'))
  )
    throw Error('Customized onlyBuiltDependencies requires review; no source was changed.');
  const allowed = policy.allowBuilds;
  if (
    allowed !== undefined &&
    (allowed === null ||
      typeof allowed !== 'object' ||
      Array.isArray(allowed) ||
      Object.keys(allowed).length !== 2 ||
      Reflect.get(allowed, 'esbuild') !== true ||
      Reflect.get(allowed, 'workerd') !== true)
  )
    throw Error('Customized allowBuilds requires review; no source was changed.');
  if (previous === undefined && allowed !== undefined) return;
  // Missing policy is not permission to enable lifecycle scripts.
  if (previous === undefined && allowed === undefined)
    throw Error('Missing reviewed pnpm build policy; reconcile it explicitly before updating.');
  const pair = document.contents.items.find(
    (item) =>
      item.key &&
      typeof item.key === 'object' &&
      'value' in item.key &&
      item.key.value === 'onlyBuiltDependencies',
  );
  const key = pair?.key as { range?: readonly number[] } | undefined;
  const value = pair?.value as { range?: readonly number[] } | undefined;
  if (!key?.range || !value?.range)
    throw Error('Cannot safely locate canonical pnpm build policy.');
  const replacement = allowed === undefined ? `allowBuilds: ${JSON.stringify(expected)}\n` : '';
  const updated = source.slice(0, key.range[0]) + replacement + source.slice(value.range[2]);
  const updatedDocument = parseDocument(updated);
  const expectedPolicy: Record<string, unknown> = { ...policy, allowBuilds: expected };
  delete expectedPolicy.onlyBuiltDependencies;
  let validPolicy = false;
  try {
    validPolicy =
      !updatedDocument.errors.length && isDeepStrictEqual(updatedDocument.toJS(), expectedPolicy);
  } catch {
    /* Never expose untrusted YAML alias details in a conflict. */
  }
  if (!validPolicy)
    throw Error(
      'The pnpm policy uses aliases or custom syntax that cannot be safely upgraded; preserve and reconcile it explicitly.',
    );
  e.writes.set(file, updated);
}

/** Remove only the previous canonical CSS URL adapter, retaining the authored document. */
function updateRootStylesheet(e: CapabilityEditor) {
  const file = 'apps/web/src/routes/__root.tsx';
  const source = e.read(file);
  if (source === null || !/\bfrom\s*(['"])\.\.\/styles\.css\?url\1/.test(source)) return;
  const imports = [
    ...source.matchAll(
      /^import[ \t]+styles[ \t]+from[ \t]+(['"])\.\.\/styles\.css\?url\1;[ \t]*\r?$/gm,
    ),
  ];
  const links = [
    ...source.matchAll(
      /^[ \t]*links:[ \t]*\[[ \t]*\{[ \t]*rel:[ \t]*(['"])stylesheet\1[ \t]*,[ \t]*href:[ \t]*styles[ \t]*\}[ \t]*\],[ \t]*\r?\n/gm,
    ),
  ];
  const head = source.indexOf('head: () => ({');
  const component = source.indexOf('component: Root', head);
  if (
    imports.length !== 1 ||
    links.length !== 1 ||
    head < 0 ||
    component < 0 ||
    links[0].index! < head ||
    links[0].index! > component ||
    source.split('export const Route = createRootRoute({').length !== 2
  )
    throw Error(
      'Customized root stylesheet adapter needs review; preserve the authored root document.',
    );
  const imported = imports[0];
  const linked = links[0];
  const remainder = source.replace(imported[0], '').replace(linked[0], '');
  if (/\bstyles\b/.test(remainder))
    throw Error(
      'The root stylesheet URL has additional uses; preserve and reconcile them explicitly.',
    );
  const updated = source
    .replace(imported[0], `import ${imported[1]}../styles.css${imported[1]};`)
    .replace(linked[0], '');
  e.writes.set(file, updated);
}

export async function planStackUpdate(
  root: string,
  artifact?: PublishedCliArtifact,
  dependencies?: UpdateDependencies,
) {
  if (
    artifact !== undefined &&
    (!isPublishedCliArtifact(artifact) || artifact.version !== GENERATOR_VERSION)
  )
    throw Error(
      'Only a verified published artifact matching this CLI can update deployment provenance.',
    );
  assertPublicWorkspace(root, false, 'stack');
  const e = new CapabilityEditor(root, {}, 'update');
  const state = readState(e);
  Object.assign(e.managed, state.managedFiles);
  const configuration = e.json('anhedral.json');
  const previousVersion = configuration.composition.generatorVersion;
  const conflicts: { code: string; message: string }[] = [];
  const newer = newerSourceMessage(previousVersion);
  if (newer) conflicts.push({ code: 'NEWER_SOURCE', message: newer });
  const attempt = (action: () => void) => {
    try {
      action();
    } catch (error) {
      conflicts.push({
        code: 'SOURCE_CONFLICT',
        message: (error instanceof Error ? error.message : String(error)).slice(0, 1000),
      });
    }
  };
  if (existsSync(path.join(root, '.anhedral-journal.json')))
    conflicts.push({
      code: 'RECOVERY_REQUIRED',
      message:
        'An interrupted source transaction exists. Recover the original command before updating.',
    });
  attempt(() => {
    updateRootStylesheet(e);
    composeCapabilities(e, state.installed, 'update');
  });
  attempt(() => updatePnpmPolicy(e));
  let artifactRequired = true;
  const legacy = configuration.composition?.contractVersion === 2;
  const hostedIds = state.installed.filter((id) => id !== 'db' && id !== 'web');
  if (legacy)
    attempt(() => {
      const source = e.read('deployment.json');
      const composition = composeSourceProvenance(configuration.composition, state.installed, []);
      if (source !== null) {
        const manifest = deploymentManifestSchema.parse(e.json('deployment.json'));
        if (
          manifest.foundation !== 'tanstack-start' ||
          manifest.identity !== composition.identity ||
          JSON.stringify([...manifest.capabilities].sort()) !==
            JSON.stringify([...hostedIds].sort())
        )
          throw Error(
            'Deployment identity or capabilities disagree with installed source; preserve and reconcile deployment.json.',
          );
        if (artifact) {
          artifactRequired = false;
          if (JSON.stringify(manifest.cliArtifact) !== JSON.stringify(artifact))
            e.set('deployment.json', ['cliArtifact'], artifact);
          if (
            JSON.stringify(
              deploymentManifestSchema.parse(e.json('deployment.json')).cliArtifact,
            ) !== JSON.stringify(artifact)
          )
            throw Error(
              'Deployment artifact has ambiguous source keys; preserve and reconcile deployment.json.',
            );
        }
      } else if (artifact) {
        const manifest = deploymentManifestSchema.parse({
          contractVersion: 1,
          foundation: 'tanstack-start',
          capabilities: hostedIds,
          identity: composition.identity,
          cliArtifact: artifact,
          intent: {
            contractVersion: 1,
            runtimeProfile: 'anhedral-stack',
            environment: 'preview',
            visibility: 'protected',
          },
        });
        e.create('deployment.json', JSON.stringify(manifest, null, 2) + '\n');
        artifactRequired = false;
      }
    });

  if (!conflicts.length)
    attempt(() => {
      const composition = composeSourceProvenance(
        configuration.composition,
        legacy ? hostedIds : state.installed,
        [],
        usesD1(e),
      );
      if (configuration.setup.cliVersion !== GENERATOR_VERSION)
        e.set('anhedral.json', ['setup', 'cliVersion'], GENERATOR_VERSION);
      if (JSON.stringify(composition) !== JSON.stringify(configuration.composition))
        e.set('anhedral.json', ['composition'], composition);
      if (JSON.stringify(e.managed) !== JSON.stringify(state.managedFiles))
        e.set('anhedral.json', ['capabilities', 'managedFiles'], e.managed);
      const updatedConfiguration = e.json('anhedral.json');
      if (
        updatedConfiguration.setup.cliVersion !== GENERATOR_VERSION ||
        !isDeepStrictEqual(updatedConfiguration.composition, composition) ||
        !isDeepStrictEqual(updatedConfiguration.capabilities.managedFiles, e.managed)
      )
        throw Error(
          'Ambiguous source provenance keys; preserve and reconcile anhedral.json before updating.',
        );
    });
  const sourceWrites = new Map(e.writes);
  let pins: DependencyPin[] = [];
  let verifyInputs = () => {};
  let dependencyInputsDigest: string | undefined;
  if (dependencies && !conflicts.length) {
    const update = await planDependencyUpdate(e, state.installed, dependencies);
    pins = update.pins;
    verifyInputs = update.verify;
    dependencyInputsDigest = update.inputDigest;
  }
  const pinFiles = new Set(
    pins.filter((pin) => pin.proposed !== pin.current).map((pin) => pin.file),
  );
  const isLock = (file: string) =>
    file === 'pnpm-lock.yaml' || path.basename(file) === 'Cargo.lock';
  const entries = [...e.writes]
    .filter(([file, after]) => e.before.get(file) !== after)
    .sort(([a], [b]) => a.localeCompare(b));
  const total = entries
    .filter(([file]) => !isLock(file))
    .reduce(
      (bytes, [file, after]) =>
        bytes + Buffer.byteLength(e.before.get(file) ?? '') + Buffer.byteLength(after),
      0,
    );
  if (entries.length > MAX_UPDATE_FILES || total > MAX_UPDATE_BYTES)
    conflicts.push({
      code: 'PREVIEW_LIMIT',
      message: `Update exceeds the bounded preview (${MAX_UPDATE_FILES} files/${MAX_UPDATE_BYTES} bytes); preserve source and reconcile it explicitly.`,
    });
  let changes =
    total > MAX_UPDATE_BYTES || entries.length > MAX_UPDATE_FILES
      ? []
      : entries.map(([file, after]) => ({
          path: file,
          beforeDigest: e.before.get(file) === null ? null : fingerprint(e.before.get(file)!),
          afterDigest: fingerprint(after),
          diff: isLock(file)
            ? ''
            : pinFiles.has(file)
              ? sourceWrites.has(file) && sourceWrites.get(file) !== e.before.get(file)
                ? updateDiff(file, e.before.get(file) ?? null, sourceWrites.get(file)!)
                : ''
              : updateDiff(file, e.before.get(file) ?? null, after),
        }));
  if (
    changes.some(
      (change) =>
        /["']?[A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PRIVATE_KEY|API_KEY|AUTHORIZATION)[A-Z0-9_]*["']?\s*[:=]/i.test(
          change.diff,
        ) || /postgres(?:ql)?:\/\/[^\s"'/]+@/i.test(change.diff),
    )
  ) {
    conflicts.push({
      code: 'SENSITIVE_PREVIEW',
      message:
        'A changed configuration block may contain private values. Preserve it and reconcile that owned configuration before updating.',
    });
    changes = [];
  }
  const plan = {
    schemaVersion: 1,
    root,
    fromVersion: previousVersion,
    toVersion: GENERATOR_VERSION,
    changes,
    pins,
    lockfiles: [...e.before]
      .filter(([file]) => isLock(file) && (e.writes.has(file) || e.before.get(file) !== null))
      .map(([file, before]) => {
        const after = e.read(file)!;
        return {
          path: file,
          beforeDigest: before === null ? null : fingerprint(before),
          afterDigest: fingerprint(after),
          status: before === null ? 'created' : before === after ? 'unchanged' : 'updated',
        };
      })
      .sort((a, b) => a.path.localeCompare(b.path)),
    dependencyInputsDigest,
    dependencyResolution: dependencies ? 'registry' : 'offline',
    conflicts,
    sourceOnly: true,
    dependenciesInstalled: false,
    resourcesProvisionedByCli: false,
    deployment: {
      provenanceReady: !artifactRequired && conflicts.length === 0,
      artifactRequired,
      artifact: artifact ?? null,
      message: !legacy
        ? 'Progressive workspaces require separate hosted runtime admission.'
        : artifactRequired
          ? 'Resolve the published CLI artifact before refreshing deployment provenance. Rerun without --offline when online.'
          : 'CLI artifact verified against official release metadata and npm. Hosting and build admission remain server-owned.',
    },
    nextAction:
      'Review the diff, apply with --expect-plan, then install dependencies and validate the application separately.',
  };
  return {
    editor: e,
    entries,
    verifyInputs,
    plan: { ...plan, planId: fingerprint(JSON.stringify(plan)) },
  };
}

export async function runStackUpdate(
  args: string[],
  output: OutputOptions,
  dependencies: UpdateDependencies & { resolveArtifact?: typeof resolvePublishedCliArtifact } = {},
) {
  const parsed = commandArguments('stack', args);
  const expected = parsed.value('--expect-plan');
  if (expected !== undefined && !/^[a-f0-9]{64}$/.test(expected))
    throw commandArgumentError('stack', '--expect-plan requires a SHA-256 plan ID.');
  const root = projectRoot(process.cwd());
  assertPublicWorkspace(root, false, 'stack');
  let artifact: PublishedCliArtifact | undefined;
  if (
    !parsed.has('--offline') &&
    new CapabilityEditor(root, {}).json('anhedral.json').composition?.contractVersion === 2
  ) {
    try {
      artifact = await (dependencies.resolveArtifact ?? resolvePublishedCliArtifact)();
    } catch (error) {
      if (error instanceof ArtifactUnavailableError)
        throw new CliFailure(
          error.message,
          'ARTIFACT_UNAVAILABLE',
          'Retry after publication or preview with stack update --offline --dry-run --json. Deployment provenance stays pending offline.',
          'network',
          true,
        );
      throw error;
    }
  }
  const { editor, entries, verifyInputs, plan } = await planStackUpdate(
    root,
    artifact,
    parsed.has('--offline') ? undefined : dependencies,
  );
  const verify = () => {
    editor.verify();
    verifyInputs();
  };
  if (expected !== undefined && expected !== plan.planId)
    throw new CliFailure(
      'The source update plan changed. Review a fresh --dry-run before applying.',
      'UPDATE_PLAN_CHANGED',
      'Run anhedral stack update --dry-run --json and review the new plan before applying.',
      'conflict',
      false,
    );
  let applied = false;
  if (!parsed.has('--dry-run') && !plan.conflicts.length) {
    if (entries.length)
      await runStagedTransaction(root, {
        commitPaths: entries.map(([file]) => file),
        recover: false,
        prepare: verify,
        build: async (stage) => {
          for (const [file, source] of entries) {
            put(stage, file, source);
            if (editor.before.get(file) !== null)
              chmodSync(path.join(stage, file), statSync(path.join(root, file)).mode & 0o777);
          }
          verify();
        },
      });
    else verify();
    applied = true;
  }
  if (plan.conflicts.length) process.exitCode = 1;
  const terminalSafe = (value: string) =>
    stripVTControlCharacters(value.replace(/\r\n/g, '\n')).replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '');
  const quote = (s: string) =>
    "'" + s.replaceAll("'", process.platform === 'win32' ? "''" : "'\\''") + "'";
  const executable = existsSync(new URL('../../.git', import.meta.url))
    ? 'node ' + quote(fileURLToPath(new URL('../bin.js', import.meta.url)))
    : 'pnpm dlx anhedral@' + GENERATOR_VERSION;
  const nextAction = plan.conflicts.length
    ? 'Resolve the listed conflicts, then preview the update again.'
    : !entries.length
      ? 'Your generated stack files are up to date.'
      : applied
        ? parsed.has('--offline')
          ? 'Run pnpm install and pnpm check in the project directory.'
          : 'Run pnpm install --frozen-lockfile and pnpm check in the project directory.'
        : `Apply this preview with ${executable} --cwd ${quote(root)} stack update${parsed.has('--offline') ? ' --offline' : ''} --expect-plan ${plan.planId}`;
  const changed = plan.pins.filter((p) => p.current !== p.proposed);
  const lines = [
    (applied ? 'Applied' : 'Preview') +
      ' stack update ' +
      (plan.fromVersion ?? 'unknown') +
      ' → ' +
      plan.toVersion,
    'Plan: ' + plan.planId,
    ...changed.map((p) => p.file + '  ' + p.name + '  ' + p.current + ' → ' + p.proposed),
    ...(plan.pins.length > changed.length
      ? [plan.pins.length - changed.length + ' pins already current.']
      : []),
    ...plan.lockfiles.map((file) => file.path + '  ' + file.status),
    ...plan.changes.map((change) => change.diff).filter(Boolean),
    ...plan.conflicts.map((conflict) => conflict.message),
    nextAction,
  ];
  createReporter(output, () => terminalSafe(lines.join('\n'))).result({
    ...plan,
    nextAction,
    dryRun: parsed.has('--dry-run'),
    applied,
  });
}
