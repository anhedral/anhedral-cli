import path from 'node:path';
import { realpathSync, existsSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { EAS_CLI_VERSION } from './dependencies.js';
import { readBoundedFile, MAX_PROJECT_JSON_BYTES } from './bounded-file.js';
import { requiredProviders } from './provider-auth.js';
import { planProviderProvisioning, provisionSelectedProviders } from './providers/provision.js';
import { configuredRuntime, runtimeTargets, RUNTIME_KEYS } from './providers/runtime.js';
import { CREDENTIALS } from './providers/api.js';
import { atomicJson, defaultRunner, type DeliveryRunner } from './project-state.js';
import { withLifecycleOperation } from './lifecycle.js';

export interface MobileBuildOptions {
  platform: 'ios' | 'android';
  profile: string;
  dryRun?: boolean;
}

function artifactUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password) return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}

interface PendingMobileBuild {
  schemaVersion: 1;
  status?: 'submitting' | 'queued';
  commit: string;
  platform: string;
  profile: string;
  projectId: string;
  buildId?: string;
}

function pendingBuild(
  root: string,
  commit: string,
  options: MobileBuildOptions,
  projectId: unknown,
): PendingMobileBuild | undefined {
  const file = path.join(root, '.anhedral/mobile-build.pending.json');
  if (!existsSync(file)) return undefined;
  let pending;
  try {
    pending = JSON.parse(readBoundedFile(file, MAX_PROJECT_JSON_BYTES).toString('utf8'));
  } catch {
    throw new Error('Invalid pending EAS build. Inspect the selected project before retrying.');
  }
  if (
    !pending ||
    typeof pending !== 'object' ||
    Array.isArray(pending) ||
    pending.schemaVersion !== 1 ||
    Object.keys(pending).some(
      (key) =>
        ![
          'schemaVersion',
          'status',
          'commit',
          'platform',
          'profile',
          'projectId',
          'buildId',
        ].includes(key),
    ) ||
    ![undefined, 'submitting', 'queued'].includes(pending.status) ||
    pending.commit !== commit ||
    pending.platform !== options.platform ||
    pending.profile !== options.profile ||
    pending.projectId !== projectId ||
    (pending.status === 'submitting'
      ? Object.hasOwn(pending, 'buildId')
      : typeof pending.buildId !== 'string' || !/^[a-zA-Z0-9-]{1,255}$/.test(pending.buildId))
  )
    throw new Error('Pending EAS build differs from the selected source or profile.');
  if (pending.status === 'submitting')
    throw new Error(
      'EAS submission has an unknown outcome. Reconcile the selected project before retrying.',
    );
  return pending;
}

/** EAS builds produce artifacts; store submission is a separate user action. */
export async function buildMobileApplication(
  root: string,
  options: MobileBuildOptions,
  run: DeliveryRunner = defaultRunner,
) {
  if (options.dryRun) return executeMobileBuild(root, options, run);
  // Validate local build configuration before creating an execution record.
  await executeMobileBuild(root, { ...options, dryRun: true }, run);
  return withLifecycleOperation(root, 'mobile', run, (session) =>
    session.phase('mobile-build', () => executeMobileBuild(root, options, run)),
  );
}

interface EasBuild {
  id?: string;
  platform?: string;
  buildProfile?: string;
  environment?: string;
  isForIosSimulator?: boolean;
  status?: string;
  gitCommitHash?: string;
  project?: { id?: string; ownerAccount?: { name?: string }; slug?: string };
  artifacts?: { applicationArchiveUrl?: string; buildUrl?: string };
}

interface EasProfile {
  extends?: unknown;
  environment?: string;
  developmentClient?: boolean;
  distribution?: string;
  ios?: { simulator?: boolean };
  android?: { buildType?: string };
}

function mobileConfiguration(root: string, options: MobileBuildOptions) {
  root = realpathSync(root);
  if (
    !['ios', 'android'].includes(options.platform) ||
    !/^[a-z][a-z0-9-]{0,63}$/.test(options.profile)
  )
    throw new Error('Select an explicit mobile platform and build profile.');
  if (!requiredProviders(root).some((provider) => provider.id === 'expo'))
    throw new Error('This project does not select Expo.');
  const directory = realpathSync(path.join(root, 'apps/mobile'));
  if (!directory.startsWith(root + path.sep))
    throw new Error('Mobile app escapes project directory.');
  let configuration;
  try {
    configuration = JSON.parse(
      readBoundedFile(path.join(directory, 'eas.json'), MAX_PROJECT_JSON_BYTES).toString('utf8'),
    );
  } catch {
    throw new Error('A valid EAS build configuration is required.');
  }
  const profile = configuration?.build?.[options.profile] as EasProfile | undefined;
  if (!profile || typeof profile !== 'object' || Array.isArray(profile))
    throw new Error('Requested EAS profile is not configured.');
  if (profile.extends) throw new Error('Resolve inherited EAS profiles before automatic delivery.');
  const selectedEnvironment =
    profile.environment ??
    (profile.developmentClient
      ? 'development'
      : profile.distribution === 'internal'
        ? 'preview'
        : 'production');
  if (!['development', 'preview', 'production'].includes(selectedEnvironment))
    throw new Error('Select an explicit supported EAS environment.');
  const args = [
    'dlx',
    `eas-cli@${EAS_CLI_VERSION}`,
    'build',
    '--platform',
    options.platform,
    '--profile',
    options.profile,
    '--non-interactive',
    '--json',
    '--no-wait',
  ];
  return { root, options, directory, profile, selectedEnvironment, args };
}
type MobileConfiguration = ReturnType<typeof mobileConfiguration>;

function readMobileApplication(directory: string) {
  const app = JSON.parse(
    readBoundedFile(path.join(directory, 'app.json'), MAX_PROJECT_JSON_BYTES).toString('utf8'),
  ).expo;
  if (['app.config.js', 'app.config.ts'].some((file) => existsSync(path.join(directory, file))))
    throw new Error('Automatic EAS setup requires a static app.json with explicit owner and slug.');
  if (
    typeof app?.owner !== 'string' ||
    !/^[a-zA-Z0-9_-]+$/.test(app.owner) ||
    typeof app.slug !== 'string' ||
    !/^[a-zA-Z0-9_-]+$/.test(app.slug)
  )
    throw new Error('Set the intended Expo owner and slug in app.json before shipping.');
  return app as { owner: string; slug: string; extra?: { eas?: { projectId?: unknown } } };
}
type MobileApplication = ReturnType<typeof readMobileApplication>;

function mobileEnvironment(): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...process.env, CI: '1', NO_COLOR: '1' };
  // Expo keeps its own login credential; server/provider keys never reach native builds.
  for (const key of [...Object.values(CREDENTIALS), ...RUNTIME_KEYS])
    if (!key.startsWith('EXPO_PUBLIC_')) delete environment[key];
  for (const name of Object.keys(environment))
    if (
      !name.startsWith('EXPO_PUBLIC_') &&
      /SECRET|PASSWORD|ADMIN_KEY|API_KEY|DATABASE_URL|AUTHORIZATION/.test(name)
    )
      delete environment[name];
  return environment;
}

async function mobileSource(
  root: string,
  environment: NodeJS.ProcessEnv,
  run: DeliveryRunner,
): Promise<string> {
  if (
    realpathSync((await run('git', ['rev-parse', '--show-toplevel'], root, environment)).trim()) !==
      root ||
    (await run('git', ['status', '--porcelain'], root, environment)).trim()
  )
    throw new Error('Mobile delivery requires a clean application Git repository.');
  const commit = (await run('git', ['rev-parse', 'HEAD'], root, environment)).trim();
  if (!/^[a-f0-9]{40,64}$/.test(commit)) throw new Error('Invalid mobile source commit.');
  return commit;
}

const easCli = ['dlx', `eas-cli@${EAS_CLI_VERSION}`];
interface MobileSession {
  configuration: MobileConfiguration;
  app: MobileApplication;
  environment: NodeJS.ProcessEnv;
  run: DeliveryRunner;
}
interface BuildSelection {
  commit: string;
  projectId: string;
  values?: Record<string, string>;
}

async function linkMobileProject({
  configuration: { directory },
  app,
  environment,
  run,
}: MobileSession) {
  const cli = easCli;
  await run(
    'pnpm',
    [...cli, 'project:init', '--non-interactive', '--force'],
    directory,
    environment,
  );
  const linked = JSON.parse(
    readBoundedFile(path.join(directory, 'app.json'), MAX_PROJECT_JSON_BYTES).toString('utf8'),
  ).expo;
  if (
    linked?.owner !== app.owner ||
    linked.slug !== app.slug ||
    typeof linked.extra?.eas?.projectId !== 'string' ||
    !/^[a-f0-9-]{36}$/i.test(linked.extra.eas.projectId)
  )
    throw new Error(
      'EAS did not confirm a project link for the selected owner and slug. Inspect the account before retrying.',
    );
  return {
    state: 'configuration-required',
    deployed: false,
    storeSubmission: false,
    nextAction: 'Review and commit the EAS project link written to app.json, then run ship again.',
  };
}

async function verifyMobileProject(session: MobileSession, projectId: string): Promise<void> {
  const {
    configuration: { directory },
    app,
    environment,
    run,
  } = session;
  const cli = easCli;
  const remote = await run('pnpm', [...cli, 'project:info'], directory, environment);
  const remoteName = remote
    .split(/\r?\n/)
    .find((line) => /^fullName\s+/.test(line.trim()))
    ?.trim()
    .split(/\s+/)[1];
  const remoteId = remote
    .split(/\r?\n/)
    .find((line) => /^ID\s+/.test(line.trim()))
    ?.trim()
    .split(/\s+/)[1];
  if (remoteId !== projectId || remoteName !== `@${app.owner}/${app.slug}`)
    throw new Error('EAS project identity differs from the selected owner and project.');
}

async function configureMobileEnvironment(
  session: MobileSession,
  values: BuildSelection['values'],
): Promise<void> {
  const {
    configuration: { directory, selectedEnvironment },
    environment,
    run,
  } = session;
  const cli = easCli;
  if (values && Object.keys(values).length) {
    const file = path.join(tmpdir(), `anhedral-expo-${randomUUID()}.env`);
    try {
      writeFileSync(
        file,
        Object.entries(values)
          .map(([key, value]) => `${key}=${JSON.stringify(value)}\n`)
          .join(''),
        { mode: 0o600, flag: 'wx' },
      );
      await run(
        'pnpm',
        [...cli, 'env:push', '--environment', selectedEnvironment, '--path', file, '--force'],
        directory,
        environment,
      );
    } finally {
      rmSync(file, { force: true });
    }
  }
}

async function requestMobileBuild(session: MobileSession, selection: BuildSelection) {
  const {
    configuration: { root, options, directory, args },
    environment,
    run,
  } = session;
  const { commit, projectId, values } = selection;
  const cli = easCli;
  const source = () => mobileSource(root, environment, run);
  let builds: unknown;
  let expectedBuildId: string | undefined;
  const pendingFile = path.join(root, '.anhedral/mobile-build.pending.json');
  try {
    const pending = pendingBuild(root, commit, options, projectId);
    if (pending) {
      const buildId = pending.buildId;
      if (!buildId) throw new Error('Pending EAS build has no verified ID.');
      expectedBuildId = buildId;
      builds = [
        JSON.parse(
          await run('pnpm', [...cli, 'build:view', buildId, '--json'], directory, environment),
        ),
      ];
    } else {
      if ((await source()) !== commit)
        throw new Error('Source changed before EAS build submission.');
      // Record intent before the remote queue mutation, including lost or invalid responses.
      atomicJson(pendingFile, {
        schemaVersion: 1,
        status: 'submitting',
        commit,
        platform: options.platform,
        profile: options.profile,
        projectId,
      });
      builds = JSON.parse(await run('pnpm', args, directory, { ...environment, ...values }));
    }
  } catch {
    throw new Error(
      'EAS build did not return verified completion; inspect the selected Expo project before retrying.',
    );
  }
  return { builds, expectedBuildId, pendingFile };
}

function validateMobileBuild(
  session: MobileSession,
  selection: BuildSelection,
  builds: unknown,
  expectedBuildId?: string,
) {
  const {
    configuration: { options, profile, selectedEnvironment },
    app,
  } = session;
  const { commit, projectId } = selection;
  if (!Array.isArray(builds) || builds.length !== 1)
    throw new Error('EAS returned an unexpected build selection.');
  const build: EasBuild = builds[0];
  if (typeof build?.id !== 'string' || !/^[a-zA-Z0-9-]{1,255}$/.test(build.id))
    throw new Error('EAS did not return a valid build ID.');
  if (
    build.project?.id !== projectId ||
    build.project?.ownerAccount?.name !== app.owner ||
    build.project?.slug !== app.slug
  )
    throw new Error('EAS build belongs to a different project.');
  validateBuildProfile(build, options, profile, selectedEnvironment);
  if (build.gitCommitHash !== commit)
    throw new Error('EAS build source differs from the selected source commit.');
  if (expectedBuildId && build.id !== expectedBuildId)
    throw new Error('EAS returned a different build than the recorded selection.');
  return build as EasBuild & { id: string };
}

function validateBuildProfile(
  build: EasBuild,
  options: MobileBuildOptions,
  profile: EasProfile,
  selectedEnvironment: string,
): void {
  if (
    build.platform !== options.platform.toUpperCase() ||
    build.buildProfile !== options.profile ||
    (build.environment !== undefined && build.environment !== selectedEnvironment) ||
    (options.platform === 'ios' && build.isForIosSimulator !== (profile.ios?.simulator === true))
  )
    throw new Error(
      'EAS build platform, profile or environment differs from the selected configuration.',
    );
}

function mobileArtifact(options: MobileBuildOptions, profile: EasProfile): string {
  if (options.platform === 'ios') return profile.ios?.simulator === true ? 'ios-simulator' : 'ipa';
  return profile.android?.buildType === 'apk' ||
    profile.distribution === 'internal' ||
    profile.developmentClient === true
    ? 'apk'
    : 'aab';
}

async function recordMobileBuild(
  session: MobileSession,
  selection: BuildSelection,
  build: EasBuild & { id: string },
  pendingFile: string,
) {
  const {
    configuration: { root, options, profile },
    app,
    environment,
    run,
  } = session;
  const { commit, projectId } = selection;
  const source = () => mobileSource(root, environment, run);
  const downloadUrl = artifactUrl(
    build.artifacts?.applicationArchiveUrl ?? build.artifacts?.buildUrl,
  );
  atomicJson(pendingFile, {
    schemaVersion: 1,
    status: 'queued',
    commit,
    platform: options.platform,
    profile: options.profile,
    projectId,
    buildId: build.id,
  });
  const buildPage = `https://expo.dev/accounts/${app.owner}/projects/${app.slug}/builds/${build.id}`;
  if (['NEW', 'IN_QUEUE', 'IN_PROGRESS', 'PENDING_CANCEL'].includes(build.status ?? ''))
    return {
      schemaVersion: 1,
      state: 'building',
      buildId: build.id,
      buildPageUrl: buildPage,
      commit,
      platform: options.platform,
      profile: options.profile,
      storeSubmission: false,
      nextAction:
        'Run the same ship command again to inspect this build without creating another build.',
    };
  if (build.status !== 'FINISHED' || !downloadUrl)
    throw new Error(
      'EAS has not confirmed a completed downloadable build. Inspect the recorded build before retrying.',
    );
  if ((await source()) !== commit)
    throw new Error(
      'Source changed during mobile build; do not treat this artifact as the current release.',
    );
  const result = {
    schemaVersion: 1,
    projectId,
    owner: app.owner,
    slug: app.slug,
    recordedAt: new Date().toISOString(),
    // Identity validation already matched the provider owner/slug to the local app.
    buildPageUrl: buildPage,
    commit,
    platform: options.platform,
    profile: options.profile,
    buildId: build.id,
    downloadUrl,
    state: 'built',
    storeSubmission: false,
    artifact: mobileArtifact(options, profile),
  };
  atomicJson(path.join(root, '.anhedral/mobile-build.json'), result);
  rmSync(pendingFile, { force: true });
  return result;
}

async function executeMobileBuild(root: string, options: MobileBuildOptions, run: DeliveryRunner) {
  const configuration = mobileConfiguration(root, options);
  root = configuration.root;
  if (options.dryRun)
    return {
      platform: options.platform,
      profile: options.profile,
      command: ['pnpm', ...configuration.args],
      mutation: false,
      storeSubmission: false,
      integrations: planProviderProvisioning(root),
    };
  const app = readMobileApplication(configuration.directory);
  const environment = mobileEnvironment();
  const session: MobileSession = { configuration, app, environment, run };
  const source = () => mobileSource(root, environment, run);
  const initialCommit = await source();
  // Unknown submissions must stop before checks, provisioning or remote configuration.
  pendingBuild(root, initialCommit, options, app.extra?.eas?.projectId);
  await run('pnpm', ['run', 'check'], root, environment);
  if ((await source()) !== initialCommit) throw new Error('Source changed during mobile checks.');
  const configured = await provisionSelectedProviders(root, false, run);
  if (!configured.ready)
    return {
      state: 'provider-configuration-required',
      deployed: false,
      integrations: configured,
      storeSubmission: false,
    };
  const runtime = configuredRuntime(root);
  const commit = await source();
  if (commit !== initialCommit) throw new Error('Source changed during provider configuration.');
  if (!app.extra?.eas?.projectId) return linkMobileProject(session);
  const projectId = app.extra.eas.projectId;
  if (typeof projectId !== 'string' || !/^[a-f0-9-]{36}$/i.test(projectId))
    throw new Error('Invalid EAS project ID.');
  await verifyMobileProject(session, projectId);
  const values = runtimeTargets(root, runtime)['apps/mobile/.env.local'];
  await configureMobileEnvironment(session, values);
  const selection = { commit, projectId, values };
  const { builds, expectedBuildId, pendingFile } = await requestMobileBuild(session, selection);
  const build = validateMobileBuild(session, selection, builds, expectedBuildId);
  return recordMobileBuild(session, selection, build, pendingFile);
}
