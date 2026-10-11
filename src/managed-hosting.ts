import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { atomicJson, withApplicationLock } from './project-state.js';

export interface ManagedProject {
  schemaVersion: 1;
  id: string;
  name: string;
  provider: 'anhedral';
  ownerId: string | null;
  projectId: string | null;
  audience: 'private' | 'public';
  hostingOrigin?: string;
}
export interface ManagedVersion {
  schemaVersion: 1;
  projectId: string;
  commit: string;
  sourceSha256: string;
  artifactSha256: string;
  sourceBytes: number;
  artifactBytes: number;
  stageId: string;
  state: 'staged' | 'saved';
  versionId?: string;
}
export type ManagedFetch = typeof fetch;
const manifest = 'anhedral.hosting.json';
const identifier = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/;
const maxBytes = 64 * 1024 * 1024;
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
function origin(): string {
  const raw = process.env.ANHEDRAL_HOSTING_ORIGIN;
  if (!raw)
    throw new Error(
      'Managed hosting backend is not configured. Set ANHEDRAL_HOSTING_ORIGIN to an operated Anhedral service; no hosting service is implied by the CLI.',
    );
  const url = new URL(raw);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
  )
    throw new Error(
      'Managed hosting requires an HTTPS origin without credentials, path, query or port.',
    );
  return url.origin;
}
function readProject(root: string): ManagedProject {
  const project = JSON.parse(readFileSync(path.join(root, manifest), 'utf8')) as ManagedProject;
  if (
    project.schemaVersion !== 1 ||
    project.provider !== 'anhedral' ||
    !identifier.test(project.id) ||
    typeof project.name !== 'string' ||
    !project.name.trim() ||
    !['private', 'public'].includes(project.audience) ||
    !(project.ownerId === null || identifier.test(project.ownerId)) ||
    !(project.projectId === null || identifier.test(project.projectId))
  )
    throw new Error('Invalid managed hosting manifest.');
  return project;
}
export function registerManagedApplication(
  root: string,
  audience: 'private' | 'public' = 'private',
): ManagedProject {
  root = realpathSync(root);
  if (existsSync(path.join(root, manifest))) return readProject(root);
  if (!['private', 'public'].includes(audience))
    throw new Error('Select private or public hosting.');
  const name = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).name;
  if (typeof name !== 'string' || !name.trim())
    throw new Error('Application requires a package name.');
  const project: ManagedProject = {
    schemaVersion: 1,
    id: randomUUID(),
    name,
    provider: 'anhedral',
    ownerId: null,
    projectId: null,
    audience,
  };
  const ignore = path.join(root, '.gitignore');
  const previous = existsSync(ignore) ? readFileSync(ignore, 'utf8') : '';
  if (!previous.split(/\r?\n/).includes('.anhedral/'))
    writeFileSync(
      ignore,
      previous + (previous && !previous.endsWith('\n') ? '\n' : '') + '.anhedral/\n',
    );
  atomicJson(path.join(root, manifest), project);
  return project;
}
function git(root: string, args: string[]): Buffer {
  return execFileSync('git', args, {
    cwd: root,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    maxBuffer: maxBytes,
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}
function source(root: string): string {
  if (
    realpathSync(git(root, ['rev-parse', '--show-toplevel']).toString().trim()) !== root ||
    git(root, ['status', '--porcelain']).toString().trim()
  )
    throw new Error('Managed versions require a clean application repository.');
  const commit = git(root, ['rev-parse', 'HEAD']).toString().trim();
  if (!/^[a-f0-9]{40,64}$/.test(commit)) throw new Error('Invalid source commit.');
  return commit;
}
function files(root: string, directory: string): string {
  const entries: string[] = [];
  let size = 0;
  const visit = (current: string) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const file = path.join(current, entry.name);
      const stat = lstatSync(file);
      if (stat.isSymbolicLink() || (!stat.isFile() && !stat.isDirectory()))
        throw new Error('Build artifacts must contain only regular files and directories.');
      if (entry.name === '.git' || entry.name.startsWith('.env'))
        throw new Error(
          'Build artifacts must not contain source credentials, Git state or dependencies.',
        );
      if (stat.isDirectory()) visit(file);
      else {
        size += stat.size;
        if (size > maxBytes || entries.length >= 10000)
          throw new Error('Managed artifact exceeds staging limits.');
        entries.push(`${path.relative(root, file)}:${digest(readFileSync(file))}`);
      }
    }
  };
  visit(directory);
  if (!entries.length) throw new Error('Build artifact directory is empty.');
  return digest(Buffer.from(entries.sort().join('\n')));
}
export async function stageManagedVersion(
  root: string,
  artifactDirectory: string,
): Promise<ManagedVersion> {
  root = realpathSync(root);
  return withApplicationLock(root, async () => {
    const project = readProject(root);
    const commit = source(root);
    const artifact = realpathSync(path.resolve(root, artifactDirectory));
    if (
      !artifact.startsWith(root + path.sep) ||
      !lstatSync(artifact).isDirectory() ||
      artifact.startsWith(path.join(root, '.anhedral') + path.sep)
    )
      throw new Error('Select an application build directory within the repository.');
    const fingerprint = files(root, artifact);
    for (const file of git(root, ['ls-files', '-z']).toString().split('\0').filter(Boolean)) {
      if (path.basename(file).startsWith('.env') && path.basename(file) !== '.env.example')
        throw new Error('Tracked environment credentials cannot be uploaded as source.');
      if (
        lstatSync(path.join(root, file)).isSymbolicLink() ||
        !lstatSync(path.join(root, file)).isFile()
      )
        throw new Error('Managed source archives do not support symlinks or submodules.');
    }
    if (!git(root, ['show', `HEAD:${manifest}`]).equals(readFileSync(path.join(root, manifest))))
      throw new Error('Commit the exact managed manifest before staging.');
    const archive = git(root, ['archive', '--format=tar', commit]);
    const staging = path.join(root, '.anhedral', 'managed');
    mkdirSync(staging, { recursive: true, mode: 0o700 });
    if (realpathSync(staging) !== staging)
      throw new Error('Managed staging must not be a symbolic link.');
    const stageId = randomUUID();
    const directory = path.join(staging, stageId);
    mkdirSync(directory, { mode: 0o700 });
    try {
      writeFileSync(path.join(directory, 'source.tar'), archive, { mode: 0o600 });
      execFileSync('tar', ['-cf', path.join(directory, 'artifact.tar'), '-C', artifact, '.'], {
        stdio: 'ignore',
      });
      const build = readFileSync(path.join(directory, 'artifact.tar'));
      if (build.length > maxBytes || archive.length > maxBytes)
        throw new Error('Managed archives exceed staging limits.');
      if (files(root, artifact) !== fingerprint || source(root) !== commit)
        throw new Error('Source or build artifact changed during staging.');
      const version: ManagedVersion = {
        schemaVersion: 1,
        projectId: project.id,
        commit,
        sourceSha256: digest(archive),
        artifactSha256: digest(build),
        sourceBytes: archive.length,
        artifactBytes: build.length,
        stageId,
        state: 'staged',
      };
      atomicJson(path.join(directory, 'version.json'), version);
      return version;
    } catch (error) {
      rmSync(directory, { recursive: true, force: true });
      throw error;
    }
  });
}
async function request(
  send: ManagedFetch,
  method: string,
  route: string,
  key?: string,
  body?: unknown | Buffer,
) {
  const token = process.env.ANHEDRAL_HOSTING_TOKEN;
  if (!token || /[\r\n]/.test(token))
    throw new Error(
      'Sign in to the configured managed hosting service; ANHEDRAL_HOSTING_TOKEN is required and never stored.',
    );
  const endpoint = `${origin()}/v1${route}`;
  let response: Response;
  try {
    response = await send(endpoint, {
      method,
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
      headers: {
        Authorization: `Bearer ${token}`,
        ...(key ? { 'Idempotency-Key': key } : {}),
        'Content-Type': Buffer.isBuffer(body) ? 'application/x-tar' : 'application/json',
      },
      body:
        body === undefined
          ? undefined
          : Buffer.isBuffer(body)
            ? new Uint8Array(body)
            : JSON.stringify(body),
    });
  } catch {
    throw new Error('Managed hosting request failed; inspect connectivity and authentication.');
  }
  let value;
  try {
    value = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error('Managed hosting returned unsupported output.');
  }
  if (!response.ok || !value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(
      `Managed hosting operation failed (HTTP ${response.status}); no deployment success was recorded.`,
    );
  return value;
}
async function context(root: string, send: ManagedFetch) {
  const project = readProject(root);
  if (project.hostingOrigin && project.hostingOrigin !== origin())
    throw new Error('Managed hosting origin differs from the recorded service.');
  const session = await request(send, 'GET', '/session');
  if (
    typeof session.ownerId !== 'string' ||
    !identifier.test(session.ownerId) ||
    (project.ownerId && session.ownerId !== project.ownerId)
  )
    throw new Error('Managed hosting session differs from the application owner.');
  return { project, ownerId: session.ownerId };
}
function identity(
  value: Record<string, unknown>,
  projectId: string,
  ownerId: string,
  audience: string,
) {
  if (value.projectId !== projectId || value.ownerId !== ownerId || value.audience !== audience)
    throw new Error('Managed hosting receipt differs from project ownership or audience.');
}
function staged(
  root: string,
  stageId: string,
  project: ManagedProject,
): { version: ManagedVersion; directory: string } {
  if (!identifier.test(stageId)) throw new Error('Invalid stage identity.');
  const directory = path.join(root, '.anhedral', 'managed', stageId);
  if (realpathSync(directory) !== directory)
    throw new Error('Managed staging directory must not be a symbolic link.');
  if (
    !lstatSync(path.join(directory, 'version.json')).isFile() ||
    lstatSync(path.join(directory, 'version.json')).isSymbolicLink()
  )
    throw new Error('Invalid staged metadata file.');
  const version = JSON.parse(
    readFileSync(path.join(directory, 'version.json'), 'utf8'),
  ) as ManagedVersion;
  if (
    version.schemaVersion !== 1 ||
    version.projectId !== project.id ||
    version.stageId !== stageId ||
    !/^[a-f0-9]{40,64}$/.test(version.commit)
  )
    throw new Error('Managed stage belongs to another project.');
  for (const [file, expected, bytes] of [
    ['source.tar', version.sourceSha256, version.sourceBytes],
    ['artifact.tar', version.artifactSha256, version.artifactBytes],
  ] as const) {
    if (
      !lstatSync(path.join(directory, file)).isFile() ||
      lstatSync(path.join(directory, file)).isSymbolicLink()
    )
      throw new Error('Invalid staged archive file.');
    const archive = readFileSync(path.join(directory, file));
    if (
      archive.length !== bytes ||
      archive.length > maxBytes ||
      digest(archive) !== expected ||
      lstatSync(path.join(directory, file)).isSymbolicLink()
    )
      throw new Error('Managed staged archive changed.');
  }
  return { version, directory };
}
export async function saveManagedVersion(
  root: string,
  stageId: string,
  send: ManagedFetch = fetch,
) {
  root = realpathSync(root);
  return withApplicationLock(root, async () => {
    const { project, ownerId } = await context(root, send);
    const { version, directory } = staged(root, stageId, project);
    const key = digest(
      Buffer.from(
        `${project.id}:${version.commit}:${version.sourceSha256}:${version.artifactSha256}`,
      ),
    );
    const created = await request(send, 'POST', '/projects', project.id, {
      clientProjectId: project.id,
      name: project.name,
      audience: project.audience,
    });
    if (
      typeof created.projectId !== 'string' ||
      !identifier.test(created.projectId) ||
      (project.projectId && created.projectId !== project.projectId)
    )
      throw new Error('Managed project identity changed.');
    identity(created, created.projectId, ownerId, project.audience);
    if (created.clientProjectId !== project.id)
      throw new Error('Backend project differs from the registered client identity.');
    const connected = {
      ...project,
      projectId: created.projectId,
      ownerId,
      hostingOrigin: origin(),
    };
    atomicJson(path.join(root, manifest), connected);
    const base = `/projects/${created.projectId}`;
    const receipt = await request(send, 'POST', `${base}/versions`, key, {
      commit: version.commit,
      sourceSha256: version.sourceSha256,
      artifactSha256: version.artifactSha256,
      sourceBytes: version.sourceBytes,
      artifactBytes: version.artifactBytes,
    });
    identity(receipt, created.projectId, ownerId, project.audience);
    if (typeof receipt.versionId !== 'string' || !identifier.test(receipt.versionId))
      throw new Error('Managed version identity is missing.');
    for (const kind of ['source', 'artifact'] as const) {
      const bytes = readFileSync(path.join(directory, `${kind}.tar`));
      const uploaded = await request(
        send,
        'PUT',
        `${base}/versions/${receipt.versionId}/${kind}`,
        `${key}:${kind}`,
        bytes,
      );
      identity(uploaded, created.projectId, ownerId, project.audience);
      if (
        uploaded.versionId !== receipt.versionId ||
        uploaded.sha256 !== digest(bytes) ||
        uploaded.bytes !== bytes.length
      )
        throw new Error('Managed upload receipt differs from the staged archive.');
    }
    const saved = await request(send, 'GET', `${base}/versions/${receipt.versionId}`);
    identity(saved, created.projectId, ownerId, project.audience);
    if (
      saved.versionId !== receipt.versionId ||
      saved.commit !== version.commit ||
      saved.sourceSha256 !== version.sourceSha256 ||
      saved.artifactSha256 !== version.artifactSha256 ||
      saved.state !== 'saved'
    )
      throw new Error('Backend has not confirmed an exact saved source/build version.');
    const result: ManagedVersion = { ...version, state: 'saved', versionId: receipt.versionId };
    atomicJson(path.join(directory, 'version.json'), result);
    return result;
  });
}
export async function deployManagedVersion(
  root: string,
  stageId: string,
  send: ManagedFetch = fetch,
) {
  root = realpathSync(root);
  return withApplicationLock(root, async () => {
    const { project, ownerId } = await context(root, send);
    const { version } = staged(root, stageId, project);
    if (
      !project.projectId ||
      version.state !== 'saved' ||
      !version.versionId ||
      !identifier.test(version.versionId)
    )
      throw new Error('Save the exact managed version before requesting deployment.');
    const base = `/projects/${project.projectId}`;
    identity(await request(send, 'GET', base), project.projectId, ownerId, project.audience);
    const receipt = await request(
      send,
      'POST',
      `${base}/deployments`,
      `${version.versionId}:${project.audience}`,
      {
        versionId: version.versionId,
        audience: project.audience,
        commit: version.commit,
        artifactSha256: version.artifactSha256,
      },
    );
    if (typeof receipt.deploymentId !== 'string' || !identifier.test(receipt.deploymentId))
      throw new Error('Backend did not return a deployment identity.');
    const result = await request(send, 'GET', `${base}/deployments/${receipt.deploymentId}`);
    identity(result, project.projectId, ownerId, project.audience);
    if (
      result.deploymentId !== receipt.deploymentId ||
      result.versionId !== version.versionId ||
      result.commit !== version.commit ||
      result.artifactSha256 !== version.artifactSha256 ||
      !['queued', 'building', 'deployed', 'failed'].includes(String(result.state))
    )
      throw new Error('Managed deployment evidence differs from the saved version.');
    if (result.state === 'deployed') {
      if (typeof result.url !== 'string')
        throw new Error('A deployed result requires a confirmed URL.');
      const url = new URL(result.url);
      if (url.protocol !== 'https:' || url.username || url.password || url.hash || url.search)
        throw new Error('Invalid managed deployment URL.');
    } else delete result.url;
    const confirmed = {
      projectId: project.projectId,
      ownerId,
      audience: project.audience,
      deploymentId: result.deploymentId,
      versionId: version.versionId,
      commit: version.commit,
      artifactSha256: version.artifactSha256,
      state: result.state,
      ...(result.state === 'deployed' ? { url: result.url } : {}),
    };
    atomicJson(path.join(root, '.anhedral', 'managed-deployment.json'), confirmed);
    return { ...confirmed, productVerification: 'required' };
  });
}
export async function managedApplicationStatus(root: string, send: ManagedFetch = fetch) {
  root = realpathSync(root);
  const { project, ownerId } = await context(root, send);
  if (!project.projectId)
    return { project, state: 'not-connected', productVerification: 'unverified' };
  const result = await request(send, 'GET', `/projects/${project.projectId}`);
  identity(result, project.projectId, ownerId, project.audience);
  return {
    project,
    evidence: 'provider-refresh',
    state: ['registered', 'queued', 'building', 'deployed', 'failed'].includes(String(result.state))
      ? result.state
      : 'unknown',
    productVerification: 'unverified',
  };
}
