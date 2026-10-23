import { projectLifecycle } from './project-lifecycle.js';
import path from 'node:path';
import { existsSync, lstatSync, readdirSync, realpathSync } from 'node:fs';
import { parse, type ParseError } from 'jsonc-parser';
import { readBoundedFile, MAX_PROJECT_JSON_BYTES } from './bounded-file.js';
import { parseProjectConfig, type ProjectSection } from './project-config.js';
import { inspectProject, validateSetupPlan } from './readiness.js';
import { inspectWorkspaceGraph } from './workspace-graph.js';
import { readLifecycleOperation } from './lifecycle.js';
import { readProviderStateStatus } from './providers/state.js';
import { CAPABILITY_CONTRACT } from './capability-contract.js';
import { PROVIDER_DEFINITIONS } from './providers/definitions.js';
import type {
  BindingEvidence,
  DependencyField,
  InspectionSection,
  IntegrationEvidence,
  ProjectInspection,
  ReleaseEvidence,
  ResourceEvidence,
  TargetEvidence,
  WorkspaceEvidence,
} from './inspector-model.js';

type JsonObject = Record<string, unknown>;
const MAX_FILE = 256 * 1024;
const MAX_INPUT = 4 * 1024 * 1024;
const fields: DependencyField[] = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];
function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid object.');
  return value as JsonObject;
}
function array(value: unknown, limit = 200): unknown[] {
  if (!Array.isArray(value) || value.length > limit) throw new Error('Invalid collection.');
  return value;
}
function name(value: unknown, maximum = 128): string {
  if (
    typeof value !== 'string' ||
    !value ||
    value.length > maximum ||
    !/^[a-zA-Z0-9@][a-zA-Z0-9_.@/-]*$/.test(value) ||
    /^(?:sk[-_]|rk[-_]|whsec[-_]|re_|Bearer)/i.test(value)
  )
    throw new Error('Invalid identity.');
  return value;
}
function identity(value: unknown): string {
  const id =
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0
      ? String(value)
      : name(value, 255);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,254}$/.test(id)) throw new Error('Invalid resource identity.');
  return id;
}
function directory(value: unknown): string {
  const relative = name(value);
  if (!/^(apps|packages)\/[a-z0-9][a-z0-9-]*$/.test(relative))
    throw new Error('Invalid application directory.');
  return relative;
}
function time(value: unknown): string | null {
  if (value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.length > 64) throw new Error('Invalid recorded time.');
  const parts = value.match(
    /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d):(\d\d)(?:\.\d+)?(Z|[+-](\d\d):(\d\d))$/,
  );
  if (!parts) throw new Error('Invalid recorded time.');
  const [, year, month, day, hour, minute, second, , zoneHour = '0', zoneMinute = '0'] = parts;
  const days = new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  if (
    Number(month) < 1 ||
    Number(month) > 12 ||
    Number(day) < 1 ||
    Number(day) > days ||
    Number(hour) > 23 ||
    Number(minute) > 59 ||
    Number(second) > 59 ||
    Number(zoneHour) > 23 ||
    Number(zoneMinute) > 59 ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error('Invalid recorded time.');
  return value;
}

function commit(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{40,64}$/.test(value))
    throw new Error('Invalid source identity.');
  return value;
}
function publicUrl(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > 2048) throw new Error('Invalid URL.');
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    /[\s\\]/.test(value)
  )
    throw new Error('Unsafe URL.');
  return url.href;
}
function section<T>(empty: T, message: string, read: () => T): InspectionSection<T> {
  try {
    return { state: 'available', data: read() };
  } catch {
    return { state: 'unavailable', data: empty, error: message };
  }
}

/** Local read-only inspection. Each section has bounded allowlisted inputs and an
 * independent error state. No secrets, commands, provider calls, or migrations. */
export function inspectApplication(root: string): ProjectInspection {
  root = realpathSync(root);
  if (!lstatSync(root).isDirectory()) throw new Error('Select an application directory.');
  let bytes = 0;
  const contents = new Map<string, string | null>();
  const documents = new Map<string, JsonObject | null>();
  function localFile(relative: string): string | null {
    if (relative.includes('..') || relative.startsWith('/') || relative.includes('\\'))
      throw new Error('Invalid source path.');
    const file = path.join(root, relative);
    if (!existsSync(file)) return null;
    if (realpathSync(file) !== file || !file.startsWith(root + path.sep))
      throw new Error('Source symlink is unsupported.');
    return file;
  }
  function content(relative: string, maximum = MAX_FILE): string | null {
    if (contents.has(relative)) return contents.get(relative)!;
    const file = localFile(relative);
    if (!file) {
      contents.set(relative, null);
      return null;
    }
    const value = readBoundedFile(file, maximum);
    bytes += value.length;
    if (bytes > MAX_INPUT) throw new Error('Inspection input budget exceeded.');
    const source = value.toString('utf8');
    contents.set(relative, source);
    return source;
  }
  function document(relative: string, required = false): JsonObject | null {
    if (documents.has(relative)) {
      const saved = documents.get(relative)!;
      if (required && saved === null) throw new Error('Missing source.');
      return saved;
    }
    const source = content(relative);
    if (source === null) {
      if (required) throw new Error('Missing source.');
      documents.set(relative, null);
      return null;
    }
    const errors: ParseError[] = [];
    const value = parse(source, errors);
    if (errors.length) throw new Error('Invalid source JSON.');
    const result = object(value);
    documents.set(relative, result);
    return result;
  }
  let configurationRead = false;
  let projectConfiguration: Record<string, unknown> | null = null;
  let configurationError: unknown;
  function projectSection(section: ProjectSection, required = false): JsonObject | null {
    if (!configurationRead) {
      configurationRead = true;
      try {
        const source = content('anhedral.json', MAX_PROJECT_JSON_BYTES);
        if (source !== null) projectConfiguration = parseProjectConfig(JSON.parse(source));
      } catch (error) {
        configurationError = error;
      }
    }
    if (configurationError) throw configurationError;
    const value = projectConfiguration?.[section];
    if (value === undefined) {
      if (required) throw new Error('Missing project configuration section.');
      return null;
    }
    if (Buffer.byteLength(JSON.stringify(value)) > MAX_FILE)
      throw new Error('Project configuration section exceeds inspection limit.');
    return object(value);
  }
  function apps(): string[] {
    const parent = localFile('apps');
    if (!parent) return [];
    const entries = readdirSync(parent, { withFileTypes: true });
    if (entries.length > 100 || entries.some((entry) => entry.isSymbolicLink()))
      throw new Error('Invalid apps collection.');
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => directory(`apps/${entry.name}`));
  }
  let applicationName = 'Application';
  try {
    applicationName = name(document('package.json', true)!.name, 214);
  } catch {
    /* Root identity is optional; sections remain inspectable. */
  }
  const selection = section<ProjectInspection['selection']['data']>(
    { cliVersion: null, products: [], hosting: null },
    'Project selection or scaffold provenance is unavailable. Use the recorded CLI version and inspect source.',
    () => {
      const setup = projectSection('setup', true);
      if (typeof setup?.cliVersion !== 'string' || !/^\d+\.\d+\.\d+$/.test(setup.cliVersion))
        throw new Error('Invalid CLI version.');
      validateSetupPlan(setup);
      return { cliVersion: setup.cliVersion, products: setup.products, hosting: setup.hosting };
    },
  );
  const setupProviders = section<ProjectInspection['setupProviders']['data']>(
    [],
    'Provider requirements are unavailable until the selected stack is validated.',
    () => {
      if (selection.state !== 'available') throw new Error('Unknown stack.');
      const products = selection.data.products;
      const providers: ProjectInspection['setupProviders']['data'] = [];
      const add = (
        id: string,
        managementCredential: string | null,
        ownerSteps: readonly string[],
      ) =>
        providers.push({
          id,
          managementCredential,
          ownerSteps: [...ownerSteps],
          authentication: 'not-checked',
          permissions: 'unknown',
          billing: 'unknown',
        });
      if (products.includes('hono'))
        add('cloudflare', null, [
          'Authenticate and connect the intended account and audience; verify service eligibility and required scopes.',
        ]);
      for (const [id, definition] of Object.entries(PROVIDER_DEFINITIONS))
        if (products.includes(id)) add(id, definition.credential, definition.ownerSteps);
      if (products.includes('expo'))
        add('expo', null, [
          'Authenticate the intended Expo owner; choose a build profile and supply signing prerequisites. No store submission.',
        ]);
      return providers;
    },
  );
  const workspaces = section<WorkspaceEvidence[]>(
    [],
    'Workspace manifests or local dependency references are unavailable.',
    () => {
      for (const group of ['apps', 'packages']) {
        const parent = localFile(group);
        if (!parent) continue;
        const entries = readdirSync(parent, { withFileTypes: true });
        if (entries.length > 100 || entries.some((entry) => entry.isSymbolicLink()))
          throw new Error('Invalid workspace collection.');
        for (const entry of entries.filter((entry) => entry.isDirectory()))
          document(`${directory(`${group}/${entry.name}`)}/package.json`, true);
      }
      const graph = inspectWorkspaceGraph(root);
      if (graph.length > 100) throw new Error('Workspace output exceeds limits.');
      const evidence = graph.map((node) => {
        const manifest = document(`${node.directory}/package.json`, true)!;
        return {
          name: name(node.name, 214),
          directory: directory(node.directory),
          dependencies: fields.flatMap((kind) => {
            const dependencies = manifest[kind] === undefined ? {} : object(manifest[kind]);
            return node.dependencies
              .filter(
                (dependency) =>
                  typeof dependencies[dependency] === 'string' &&
                  (dependencies[dependency] as string).startsWith('workspace:'),
              )
              .map((dependency) => ({ name: name(dependency, 214), kind }));
          }),
        };
      });
      if (evidence.some((entry) => entry.dependencies.length > 500))
        throw new Error('Dependency output exceeds limits.');
      return evidence;
    },
  );
  const configuration = section<ProjectInspection['configuration']['data']>(
    { bindings: [], schedules: [], environment: [] },
    'Configured bindings, schedules, or environment requirements are unavailable.',
    () => {
      const bindings: BindingEvidence[] = [],
        schedules: { application: string; expression: string }[] = [],
        environment: { application: string; name: string }[] = [];
      const add = (application: string, value: unknown, kind: string, idField?: string) => {
        const entry = object(value);
        const resource = idField ? entry[idField] : undefined;
        bindings.push({
          application,
          name: name(entry.binding ?? entry.name),
          kind,
          identifierRequired: Boolean(idField),
          configured:
            !idField ||
            (resource !== undefined &&
              resource !== '' &&
              !String(resource).startsWith('REPLACE_WITH_')),
          resourceId:
            resource === undefined ||
            resource === '' ||
            String(resource).startsWith('REPLACE_WITH_')
              ? null
              : identity(resource),
        });
      };
      for (const application of apps()) {
        const config = document(`${application}/wrangler.jsonc`);
        if (config) {
          for (const [field, kind, idField] of [
            ['d1_databases', 'D1', 'database_id'],
            ['r2_buckets', 'R2', 'bucket_name'],
            ['kv_namespaces', 'KV', 'id'],
            ['pipelines', 'Basin stream', 'stream'],
            ['hyperdrive', 'Hyperdrive', 'id'],
          ] as const)
            if (config[field] !== undefined)
              for (const entry of array(config[field], 500)) add(application, entry, kind, idField);
          if (config.queues) {
            const queues = object(config.queues);
            for (const entry of array(queues.producers ?? [], 500))
              add(application, entry, 'Queue producer', 'queue');
            for (const value of array(queues.consumers ?? [], 500)) {
              const entry = object(value);
              add(
                application,
                { binding: entry.queue, queue: entry.queue },
                'Queue consumer',
                'queue',
              );
            }
          }
          if (config.durable_objects)
            for (const value of array(object(config.durable_objects).bindings ?? [], 500)) {
              const entry = object(value);
              add(application, { binding: entry.name }, 'Durable Object namespace');
            }
          if (config.workflows)
            for (const entry of array(config.workflows, 500))
              add(application, entry, 'Workflow', 'name');
          if (config.ai) add(application, config.ai, 'Workers AI');
          if (config.triggers)
            for (const expression of array(object(config.triggers).crons ?? [], 200)) {
              if (
                typeof expression !== 'string' ||
                expression.length > 120 ||
                /[\x00-\x1f\x7f]/.test(expression) ||
                expression.trim().split(/\s+/).length !== 5 ||
                !expression
                  .trim()
                  .split(/\s+/)
                  .every((field) =>
                    /^(?:(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC|SUN|MON|TUE|WED|THU|FRI|SAT)|[0-9*\/,?LW#-])+$/.test(
                      field,
                    ),
                  )
              )
                throw new Error('Invalid configured schedule.');
              schedules.push({ application, expression });
            }
        }
        for (const example of ['env.example', '.env.example', '.dev.vars.example']) {
          const source = content(`${application}/${example}`);
          if (!source) continue;
          for (const line of source.split(/\r?\n/)) {
            const key = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]*)\s*=/)?.[1];
            if (
              key &&
              key.length <= 128 &&
              !environment.some((entry) => entry.application === application && entry.name === key)
            )
              environment.push({ application, name: key });
          }
        }
      }
      if (bindings.length > 500 || schedules.length > 200 || environment.length > 500)
        throw new Error('Configuration output exceeds limits.');
      return { bindings, schedules, environment };
    },
  );

  function history(filename: string, project: JsonObject): JsonObject[] {
    const value = document(filename);
    if (!value) return [];
    if (value.schemaVersion !== 1 || value.projectId !== project.id)
      throw new Error('Foreign release history.');
    return array(value.releases).map(object).slice(-50);
  }
  function release(value: JsonObject, url: unknown): ReleaseEvidence {
    if (
      !['running', 'checked', 'deployed', 'configuration-required', 'failed'].includes(
        String(value.state),
      )
    )
      throw new Error('Invalid release state.');
    return {
      id: identity(value.id),
      state: String(value.state),
      commit: commit(value.commit),
      recordedAt: time(value.recordedAt ?? value.finishedAt ?? value.startedAt),
      url: publicUrl(url),
      kind: 'deployment',
    };
  }
  function attempts(target: TargetEvidence, values: JsonObject[], project: JsonObject) {
    const known =
      target.provider === 'cloudflare'
        ? array(project.targets).map((entry) => name(object(entry).id))
        : [];
    const seen = new Set<string>();
    for (const value of values) {
      try {
        let entry: ReleaseEvidence;
        {
          const members = array(value.targets ?? []).map(object);
          const ids = members.map((member) => name(member.target));
          if (new Set(ids).size !== ids.length || ids.some((id) => !known.includes(id)))
            throw new Error('Conflicting target identities.');
          const member = members.find(
            (item) => item.target === target.id.slice('cloudflare:'.length),
          );
          if (
            value.state === 'deployed' &&
            (!member || member.providerConfirmed !== true || !member.versionId)
          )
            throw new Error('Target deployment evidence is missing.');
          if (member?.versionId) identity(member.versionId);
          entry = release(value, member ? array(member.urls ?? [], 10)[0] : undefined);
          if (
            member?.providerConfirmed === true &&
            member.versionId &&
            entry.state !== 'deployed'
          ) {
            entry.operationState = entry.state;
            entry.state = 'deployed';
          }
        }
        if (seen.has(entry.id)) throw new Error('Repeated release identity.');
        seen.add(entry.id);
        target.latestAttempt = entry;
        if (entry.state === 'deployed') target.lastSuccessful = entry;
      } catch {
        target.latestAttempt = null;
        target.error =
          'Some recorded release evidence is unavailable or conflicts with this target. Valid earlier releases remain historical evidence.';
      }
    }
  }

  function hostingTargets(): TargetEvidence[] {
    const targets: TargetEvidence[] = [];
    for (const provider of ['cloudflare'] as const) {
      try {
        const project = projectSection(provider);
        if (!project) continue;
        if (
          project.schemaVersion !== 1 ||
          project.provider !== provider ||
          project.ownership !== 'customer' ||
          typeof project.id !== 'string' ||
          !/^[a-f0-9-]{36}$/.test(project.id)
        )
          throw new Error('Invalid hosting identity.');
        if (
          provider === 'cloudflare' &&
          project.accountId !== null &&
          (typeof project.accountId !== 'string' || !/^[a-f0-9]{32}$/i.test(project.accountId))
        )
          throw new Error('Invalid Cloudflare account identity.');
        const audience = project.audience;
        if (!['public', 'private', 'unconfigured'].includes(String(audience)))
          throw new Error('Invalid audience.');
        const applications =
          provider === 'cloudflare'
            ? array(project.targets, 100).map(object)
            : [{ id: 'web', directory: 'apps/web' }];
        for (const app of applications) {
          const target: TargetEvidence = {
            id: `${provider}:${name(app.id)}`,
            provider,
            application: directory(app.directory),
            audience: audience as TargetEvidence['audience'],
            accountReference: project[provider === 'cloudflare' ? 'accountId' : 'teamId']
              ? identity(project[provider === 'cloudflare' ? 'accountId' : 'teamId'])
              : null,
            latestAttempt: null,
            lastSuccessful: null,
            delivery: 'implemented',
            liveStatus: 'unknown',
          };
          try {
            attempts(
              target,
              history(
                provider === 'cloudflare'
                  ? '.anhedral/releases.json'
                  : '.anhedral/web-releases.json',
                project,
              ),
              project,
            );
          } catch {
            target.error = 'Recorded release history is unavailable for this target.';
          }
          targets.push(target);
        }
      } catch {
        targets.push({
          id: `${provider}:unavailable`,
          provider,
          application: 'unknown',
          audience: 'unconfigured',
          accountReference: null,
          latestAttempt: null,
          lastSuccessful: null,
          delivery: 'implemented',
          liveStatus: 'unknown',
          error: 'Connected target configuration is unavailable.',
        });
      }
    }
    return targets;
  }
  const targets = section<TargetEvidence[]>([], 'Delivery targets are unavailable.', () => {
    const values = hostingTargets();
    const applications = apps();
    if (applications.includes('apps/mobile')) {
      for (const platform of ['ios', 'android']) {
        const target: TargetEvidence = {
          id: `expo:${platform}`,
          provider: 'expo',
          application: 'apps/mobile',
          audience: 'not-applicable',
          accountReference: null,
          latestAttempt: null,
          lastSuccessful: null,
          delivery: 'artifact-only',
          liveStatus: 'unknown',
        };
        try {
          const app = object(document('apps/mobile/app.json', true)!.expo);
          const extra = app.extra === undefined ? {} : object(app.extra);
          const eas = extra.eas === undefined ? {} : object(extra.eas);
          const selectedProject = eas.projectId === undefined ? null : identity(eas.projectId);
          const owner = app.owner === undefined ? null : identity(app.owner);
          const slug = app.slug === undefined ? null : identity(app.slug);
          target.accountReference = owner;
          const built = document('.anhedral/mobile-build.json');
          const pending = document('.anhedral/mobile-build.pending.json');
          function build(value: JsonObject, state: string): ReleaseEvidence {
            const buildId =
              typeof value.buildId === 'string' ? identity(value.buildId) : 'submission-unknown';
            return {
              id: buildId,
              state,
              commit: commit(value.commit),
              recordedAt: time(value.recordedAt ?? value.finishedAt ?? value.startedAt),
              url:
                owner && slug && buildId !== 'submission-unknown'
                  ? `https://expo.dev/accounts/${owner}/projects/${slug}/builds/${buildId}`
                  : null,
              kind: 'build',
              platform,
              profile: name(value.profile),
              ...(typeof value.artifact === 'string' &&
              ['ipa', 'apk', 'aab', 'ios-simulator'].includes(value.artifact)
                ? { artifact: value.artifact }
                : {}),
            };
          }
          if (built && built.platform === platform) {
            if (built.schemaVersion !== 1 || built.state !== 'built')
              throw new Error('Invalid build receipt.');
            if (built.projectId === undefined || !selectedProject) {
              target.latestAttempt = build(built, 'identity-unknown');
              target.error =
                'Historical build has no matching recorded project identity; it does not establish delivery to the current Expo project.';
            } else {
              if (identity(built.projectId) !== selectedProject)
                throw new Error('Foreign build project.');
              target.lastSuccessful = build(built, 'built');
              target.latestAttempt = target.lastSuccessful;
            }
          }
          if (pending && pending.platform === platform) {
            if (
              pending.schemaVersion !== 1 ||
              !selectedProject ||
              identity(pending.projectId) !== selectedProject ||
              !['submitting', 'queued', undefined].includes(pending.status as string | undefined)
            )
              throw new Error('Foreign or invalid pending project.');
            target.latestAttempt = build(
              pending,
              pending.status === 'submitting' ? 'outcome-unknown' : 'building',
            );
          }
        } catch {
          target.latestAttempt = null;
          target.error =
            'Recorded mobile build evidence is unavailable or conflicts with the selected project; identity and time may be unknown.';
        }
        values.push(target);
      }
    }
    if (values.length > 100) throw new Error('Target output exceeds limits.');
    return values;
  });
  const integrations = section<IntegrationEvidence[]>(
    [],
    'Private provider receipt status is unavailable. No credentials were inspected.',
    () => {
      localFile('.anhedral');
      localFile('.anhedral/providers.json');
      if (content('.anhedral/providers.json') === null) return [];
      return readProviderStateStatus(path.join(root, '.anhedral')).providers.map((provider) => ({
        provider: provider.provider,
        operations: array(provider.operations, 500).map((raw) => {
          const operation = raw as (typeof provider.operations)[number];
          const resources: Record<string, string> = {};
          for (const [key, value] of Object.entries(operation.resources ?? {}))
            resources[name(key)] = key === 'project' ? identity(object(value).id) : identity(value);
          return {
            operation: operation.operation,
            status: operation.status,
            resources,
            recovery: operation.recovery,
            kind: operation.descriptor?.key ?? null,
          };
        }),
      }));
    },
  );
  const cloudflareResources = section<ResourceEvidence[]>(
    [],
    'Recorded Cloudflare resources are unavailable or belong to another account/project.',
    () => {
      const value = document('.anhedral/resources.json');
      if (!value) return [];
      const project = projectSection('cloudflare', true)!;
      if (
        value.schemaVersion !== 1 ||
        value.projectId !== project.id ||
        value.accountId !== project.accountId
      )
        throw new Error('Foreign Cloudflare resources.');
      return array(value.resources, 500).map((raw) => {
        const entry = object(raw);
        return {
          kind: name(entry.kind),
          name: name(entry.name),
          id: identity(entry.id),
          createdByProject:
            typeof entry.createdByProject === 'boolean' ? entry.createdByProject : null,
          reused: typeof entry.reused === 'boolean' ? entry.reused : null,
          recordedAt: time(value.checkedAt),
        };
      });
    },
  );
  const serviceDeletions = section<NonNullable<ProjectInspection['serviceDeletions']>['data']>(
    [],
    'Service deletion records are unavailable or belong to another project.',
    () => {
      const value = document('.anhedral/service-deletions.json');
      if (!value) return [];
      const project = projectSection('cloudflare', true)!;
      if (
        value.schemaVersion !== 1 ||
        value.projectId !== project.id ||
        value.accountId !== project.accountId
      )
        throw new Error('Foreign deletion journal.');
      return array(value.entries, 500).map((raw) => {
        const entry = object(raw);
        if (!['pending', 'deleted', 'uncertain'].includes(String(entry.state)))
          throw new Error('Invalid deletion state.');
        return {
          resourceId: identity(entry.resourceId),
          kind: name(entry.kind),
          name: name(entry.name),
          state: entry.state as 'pending' | 'deleted' | 'uncertain',
          recordedAt: time(entry.recordedAt),
        };
      });
    },
  );
  const readiness = section<ProjectInspection['readiness']['data']>(
    { localReady: false, checks: [] },
    'Local prerequisite checks are unavailable. Provider and product readiness are unknown.',
    () => {
      for (const key of ['setup', 'standard', 'registry'] as const) projectSection(key);
      if (workspaces.state === 'unavailable') throw new Error('Unsafe workspace graph.');
      const result = inspectProject(root);
      return { localReady: result.localReady, checks: result.checks };
    },
  );
  const operation = section<ProjectInspection['operation']['data']>(
    null,
    'The recorded delivery operation is unavailable.',
    () => {
      localFile('.anhedral');
      if (content('.anhedral/operation.json') === null) return null;
      const value = readLifecycleOperation(root);
      if (value) {
        time(value.startedAt);
        time(value.updatedAt);
      }
      return value;
    },
  );
  const inspection: ProjectInspection = {
    schemaVersion: 1,
    name: applicationName,
    inspectedAt: new Date().toISOString(),
    authentication: { state: 'not-checked' },
    liveStatus: { state: 'unknown' },
    limits: [
      ...CAPABILITY_CONTRACT.limits,
      'Workspace dependency fields do not establish runtime communication.',
      'Configured bindings and environment names do not prove resource existence or credential presence.',
      'Operation phases are recorded diagnostics, not process liveness or automatic resume.',
    ],
    selection,
    setupProviders,
    workspaces,
    configuration,
    targets,
    integrations,
    cloudflareResources,
    serviceDeletions,
    readiness,
    operation,
  };
  return { ...inspection, lifecycle: projectLifecycle(inspection) };
}
