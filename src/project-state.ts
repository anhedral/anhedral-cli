import { isDeepStrictEqual } from 'node:util';
import { randomUUID } from 'node:crypto';
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  existsSync,
  lstatSync,
  fstatSync,
  openSync,
  closeSync,
  unlinkSync,
  rmdirSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { hostname } from 'node:os';
import { readBoundedFile } from './bounded-file.js';
import { parse, type ParseError } from 'jsonc-parser';
import { resolveCommand } from './command.js';

export interface DeploymentTarget {
  id: string;
  directory: string;
  workerName: string;
}
export interface ApplicationProject {
  schemaVersion: 1;
  id: string;
  name: string;
  ownership: 'customer';
  provider: 'cloudflare';
  /** Missing on existing manifests: retain the legacy Wrangler engine. */
  deliveryEngine?: 'void' | 'wrangler';
  accountId: string | null;
  audience: 'unconfigured' | 'public' | 'private';
  access?: { emails: string[] };
  targets: DeploymentTarget[];
}
export type DeliveryRunner = (
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv,
  input?: string,
) => Promise<string>;
const manifestName = 'anhedral.project.json';
const stateDirectory = '.anhedral';
const accountPattern = /^[a-f0-9]{32}$/i;
const workerPattern = /^[a-z0-9][a-z0-9-]{0,62}$/;

export function atomicJson(file: string, value: unknown): void {
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
    renameSync(temporary, file);
  } finally {
    rmSync(temporary, { force: true });
  }
}
export function configurationFile(directory: string): string {
  const canonical = path.join(directory, 'anhedral.cloudflare.json');
  return existsSync(canonical) ? canonical : path.join(directory, 'wrangler.jsonc');
}
export function usesVoid(project: ApplicationProject): boolean {
  return project.deliveryEngine === 'void';
}
function mergeVoidConfig(previous: unknown, resolved: unknown, authored: unknown): unknown {
  if (isDeepStrictEqual(previous, authored)) return resolved;
  if (Array.isArray(previous) && Array.isArray(resolved) && Array.isArray(authored)) {
    const identity = (value: unknown) => {
      if (value && typeof value === 'object')
        for (const key of ['binding', 'name', 'tag', 'class_name', 'pattern', 'route']) {
          const item = (value as Record<string, unknown>)[key];
          if (typeof item === 'string') return `${key}:${item}`;
        }
      return JSON.stringify(value);
    };
    return [
      ...authored.map((item) => {
        const before = previous.find((entry) => identity(entry) === identity(item));
        const after = resolved.find((entry) => identity(entry) === identity(item));
        return before !== undefined && after !== undefined
          ? mergeVoidConfig(before, after, item)
          : item;
      }),
      ...resolved.filter(
        (item) =>
          !previous.some((entry) => identity(entry) === identity(item)) &&
          !authored.some((entry) => identity(entry) === identity(item)),
      ),
    ];
  }
  const object = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);
  if (object(previous) && object(resolved) && object(authored)) {
    const result: Record<string, unknown> = {};
    for (const key of new Set([
      ...Object.keys(previous),
      ...Object.keys(resolved),
      ...Object.keys(authored),
    ])) {
      if (key in authored)
        Object.defineProperty(result, key, {
          value: mergeVoidConfig(previous[key], resolved[key], authored[key]),
          enumerable: true,
        });
      else if (!(key in previous) && key in resolved)
        Object.defineProperty(result, key, { value: resolved[key], enumerable: true });
    }
    return result;
  }
  return authored;
}
export function resolveVoidCloudflareConfig(
  authored: Record<string, unknown>,
  lock: Record<string, unknown>,
): Record<string, unknown> {
  const value = structuredClone(authored);
  if (
    lock.version !== 1 ||
    !lock.source ||
    typeof lock.source !== 'object' ||
    Array.isArray(lock.source) ||
    !lock.resolved ||
    typeof lock.resolved !== 'object' ||
    Array.isArray(lock.resolved) ||
    typeof lock.text !== 'string'
  )
    throw new Error('Invalid pinned Void resource lock.');
  // The generated Void configuration omits resource-ID scaffolding placeholders.
  // Match that authored input when applying Void's resolved resource identities.
  for (const [field, key] of [
    ['d1_databases', 'database_id'],
    ['kv_namespaces', 'id'],
    ['pipelines', 'stream'],
  ] as const) {
    if (Array.isArray(value[field]))
      for (const entry of value[field]) {
        if (entry && typeof entry[key] === 'string' && entry[key].startsWith('REPLACE_WITH_'))
          delete entry[key];
      }
  }
  return mergeVoidConfig(lock.source, lock.resolved, value) as Record<string, unknown>;
}
export function readConfig(directory: string): Record<string, unknown> {
  const errors: ParseError[] = [];
  const value = parse(readFileSync(configurationFile(directory), 'utf8'), errors);
  if (errors.length || !value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid Wrangler JSONC configuration.');
  const lockFile = path.join(directory, 'void.lock.json');
  if (existsSync(path.join(directory, 'anhedral.cloudflare.json')) && existsSync(lockFile)) {
    const lock = JSON.parse(readFileSync(lockFile, 'utf8'));
    return resolveVoidCloudflareConfig(value, lock);
  }
  return value;
}
export function targetDirectory(root: string, target: DeploymentTarget): string {
  if (!/^apps\/[a-z0-9-]+$/.test(target.directory))
    throw new Error('Deployment targets must be direct apps/* directories.');
  const directory = realpathSync(path.join(root, target.directory));
  if (!directory.startsWith(realpathSync(root) + path.sep))
    throw new Error('Deployment target escapes the project.');
  return directory;
}
export function registerApplication(root: string, extendTargets = false): ApplicationProject {
  root = realpathSync(root);
  const existing = existsSync(path.join(root, manifestName)) ? readApplication(root) : undefined;
  if (existing && !extendTargets) return existing;
  const setup = JSON.parse(readFileSync(path.join(root, 'anhedral.setup.json'), 'utf8'));
  if (!['cloudflare', 'vercel'].includes(setup.hosting))
    throw new Error('Automatic delivery currently supports Cloudflare projects.');
  const targets = readdirSync(path.join(root, 'apps'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .filter((entry) => existsSync(configurationFile(path.join(root, 'apps', entry.name))))
    .map((entry) => {
      const workerName = readConfig(path.join(root, 'apps', entry.name)).name;
      if (typeof workerName !== 'string' || !workerPattern.test(workerName))
        throw new Error('Invalid Worker name.');
      return { id: entry.name, directory: `apps/${entry.name}`, workerName };
    })
    .sort((a, b) => (a.id === 'web' ? 1 : b.id === 'web' ? -1 : a.id.localeCompare(b.id)));
  if (existing) {
    if (
      existing.targets.some(
        (target) =>
          !targets.some(
            (candidate) =>
              candidate.id === target.id &&
              candidate.directory === target.directory &&
              candidate.workerName === target.workerName,
          ),
      )
    )
      throw new Error('Addition cannot replace existing delivery targets.');
    const extended = { ...existing, targets };
    atomicJson(path.join(root, manifestName), extended);
    return extended;
  }
  const project: ApplicationProject = {
    schemaVersion: 1,
    id: randomUUID(),
    name:
      JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).name ?? path.basename(root),
    ownership: 'customer',
    provider: 'cloudflare',
    ...(targets.length &&
    targets.every((target) => existsSync(path.join(root, target.directory, 'void.config.ts')))
      ? { deliveryEngine: 'void' as const }
      : {}),
    accountId: null,
    audience: 'unconfigured',
    targets,
  };
  const ignoreFile = path.join(root, '.gitignore');
  const ignored = existsSync(ignoreFile) ? readFileSync(ignoreFile, 'utf8') : '';
  if (!ignored.split(/\r?\n/).includes('.anhedral/'))
    writeFileSync(
      ignoreFile,
      ignored + (ignored.endsWith('\n') || !ignored ? '' : '\n') + '.anhedral/\n',
    );
  atomicJson(path.join(root, manifestName), project);
  return project;
}
export function readApplication(root: string): ApplicationProject {
  const project = JSON.parse(
    readFileSync(path.join(root, manifestName), 'utf8'),
  ) as ApplicationProject;
  if (
    project.schemaVersion !== 1 ||
    typeof project.id !== 'string' ||
    !/^[a-f0-9-]{36}$/i.test(project.id) ||
    project.ownership !== 'customer' ||
    project.provider !== 'cloudflare' ||
    (project.deliveryEngine !== undefined &&
      !['void', 'wrangler'].includes(project.deliveryEngine)) ||
    !(project.accountId === null || accountPattern.test(project.accountId)) ||
    !['unconfigured', 'public', 'private'].includes(project.audience) ||
    !Array.isArray(project.targets)
  )
    throw new Error('Invalid application manifest.');
  if (
    project.access &&
    (!Array.isArray(project.access.emails) ||
      project.access.emails.some((email) => typeof email !== 'string'))
  )
    throw new Error('Invalid private audience configuration.');
  if (project.audience === 'private' && !project.access?.emails.length)
    throw new Error('Private delivery requires explicit allowed members.');
  const ids = new Set<string>();
  const workers = new Set<string>();
  for (const target of project.targets) {
    if (
      !target ||
      typeof target.id !== 'string' ||
      typeof target.workerName !== 'string' ||
      !/^[a-z0-9-]+$/.test(target.id) ||
      ids.has(target.id) ||
      workers.has(target.workerName) ||
      !workerPattern.test(target.workerName)
    )
      throw new Error('Invalid or duplicate deployment target.');
    ids.add(target.id);
    workers.add(target.workerName);
    targetDirectory(root, target);
  }
  return project;
}
export const defaultRunner: DeliveryRunner = (command, args, cwd, env, input) =>
  new Promise((resolve, reject) => {
    const invocation = resolveCommand(command, args);
    const child = spawn(invocation.command, invocation.args, {
      cwd,
      env,
      detached: process.platform !== 'win32',
      stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
    });
    if (input !== undefined) {
      child.stdin?.on('error', () => {});
      child.stdin?.end(input);
    }
    let output = '';
    let oversized = false;
    let interrupted = false;
    let timedOut = false;
    let forceTimer: ReturnType<typeof setTimeout> | undefined;
    const kill = (signal: NodeJS.Signals) => {
      if (!child.pid) return;
      if (process.platform === 'win32')
        spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
      else {
        try {
          process.kill(-child.pid, signal);
        } catch {
          /* The process group already exited. */
        }
      }
    };
    const stop = () => {
      kill('SIGTERM');
      forceTimer ??= setTimeout(() => kill('SIGKILL'), 2000);
      forceTimer.unref();
    };
    const interrupt = () => {
      interrupted = true;
      stop();
    };
    process.once('SIGINT', interrupt);
    process.once('SIGTERM', interrupt);
    child.stdout?.on('data', (chunk: Buffer) => {
      if (!oversized) output += chunk.toString();
      if (output.length > 8 * 1024 * 1024) {
        oversized = true;
        stop();
      }
    });
    // Do not persist raw build/provider output: it can contain credentials or customer data.
    child.stderr?.resume();
    const requestedDeadline = Number(env.ANHEDRAL_COMMAND_TIMEOUT_MS);
    const commandDeadline =
      Number.isInteger(requestedDeadline) &&
      requestedDeadline >= 1 &&
      requestedDeadline <= 20 * 60 * 1000
        ? requestedDeadline
        : 20 * 60 * 1000;
    const timer = setTimeout(() => {
      timedOut = true;
      stop();
    }, commandDeadline);
    const clean = () => {
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      process.removeListener('SIGINT', interrupt);
      process.removeListener('SIGTERM', interrupt);
    };
    child.on('error', () => {
      clean();
      reject(new Error(`Cannot run ${command}; check local tooling.`));
    });
    child.on('close', (code) => {
      clean();
      if (code === 0 && !oversized && !interrupted && !timedOut) resolve(output);
      else
        reject(
          new Error(
            `${command} ${args.slice(0, 3).join(' ')} ${interrupted ? 'was interrupted' : timedOut ? 'timed out' : 'failed'}; inspect the project command locally.`,
          ),
        );
    });
  });
export function environment(project: ApplicationProject): NodeJS.ProcessEnv {
  if (!project.accountId) throw new Error('Connect the intended Cloudflare account first.');
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_ACCOUNT_ID !== project.accountId)
    throw new Error('Cloudflare environment account conflicts with the registered account.');
  if (process.env.CLOUDFLARE_ENV)
    throw new Error(
      'Register a separate project configuration for the intended environment; CLOUDFLARE_ENV overrides are unsupported.',
    );
  return {
    ...process.env,
    CLOUDFLARE_ACCOUNT_ID: project.accountId,
    CI: 'true',
    NO_COLOR: '1',
    FORCE_COLOR: '0',
  };
}
export async function authenticate(
  root: string,
  project: ApplicationProject,
  run: DeliveryRunner,
): Promise<void> {
  const identity = JSON.parse(
    await run(
      'pnpm',
      ['exec', 'wrangler', 'whoami', '--json'],
      targetDirectory(root, project.targets[0]),
      environment(project),
    ),
  );
  if (
    identity.loggedIn !== true ||
    !Array.isArray(identity.accounts) ||
    !identity.accounts.some((account: { id: string }) => account.id === project.accountId)
  )
    throw new Error(
      'Wrangler cannot access the registered Cloudflare account. Run wrangler login or configure scoped credentials.',
    );
}
interface LockOwner {
  schemaVersion: 1;
  pid: number;
  host: string;
  token: string;
  createdAt: string;
}
interface LockIdentity {
  device: number;
  inode: number;
  ownerDevice: number;
  ownerInode: number;
  owner: LockOwner;
}
interface HeldApplicationLock {
  root: string;
  active: boolean;
  identity: LockIdentity;
}
const applicationLocks = new AsyncLocalStorage<HeldApplicationLock>();
const lockBusy = () =>
  new Error(
    'Another delivery is running or was interrupted. Inspect provider status and use anhedral recover --lock only after reviewing the recorded operation.',
  );
const ownerChanged = () =>
  new Error(
    'Delivery lock ownership changed or is invalid. Preserve the lock and inspect local operation evidence before retrying.',
  );

function privateState(root: string): string {
  const state = path.join(root, stateDirectory);
  try {
    mkdirSync(state, { recursive: true, mode: 0o700 });
    const stat = lstatSync(state);
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      realpathSync(state) !== state ||
      (process.platform !== 'win32' && stat.mode & 0o022)
    )
      throw new Error();
    return state;
  } catch {
    throw new Error('Delivery state must be a regular directory without shared write permissions.');
  }
}
function lockOwner(): LockOwner {
  return {
    schemaVersion: 1,
    pid: process.pid,
    host: hostname(),
    token: randomUUID(),
    createdAt: new Date().toISOString(),
  };
}
function privateOwner(file: string): LockOwner {
  try {
    const stat = lstatSync(file);
    if (
      !stat.isFile() ||
      stat.isSymbolicLink() ||
      (process.platform !== 'win32' && (stat.mode & 0o077 || stat.uid !== process.getuid?.()))
    )
      throw new Error();
    const value: unknown = JSON.parse(readBoundedFile(file, 4096).toString('utf8'));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    const owner = value as LockOwner;
    if (
      Object.keys(owner).some(
        (key) => !['schemaVersion', 'pid', 'host', 'token', 'createdAt'].includes(key),
      ) ||
      owner.schemaVersion !== 1 ||
      !Number.isSafeInteger(owner.pid) ||
      owner.pid < 1 ||
      owner.pid > 2147483647 ||
      typeof owner.host !== 'string' ||
      !owner.host ||
      owner.host.length > 255 ||
      /[\x00-\x1f\x7f]/.test(owner.host) ||
      typeof owner.token !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(owner.token) ||
      typeof owner.createdAt !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T/.test(owner.createdAt) ||
      !Number.isFinite(Date.parse(owner.createdAt))
    )
      throw new Error();
    return owner;
  } catch {
    throw ownerChanged();
  }
}
function snapshotLock(lock: string): { identity: LockIdentity; owner: LockOwner } {
  try {
    const stat = lstatSync(lock);
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      (process.platform !== 'win32' && (stat.mode & 0o077 || stat.uid !== process.getuid?.())) ||
      readdirSync(lock).join(',') !== 'owner.json'
    )
      throw new Error();
    const file = path.join(lock, 'owner.json');
    const owner = privateOwner(file);
    const ownerStat = lstatSync(file);
    return {
      identity: {
        device: stat.dev,
        inode: stat.ino,
        ownerDevice: ownerStat.dev,
        ownerInode: ownerStat.ino,
        owner,
      },
      owner,
    };
  } catch {
    throw ownerChanged();
  }
}
function sameOwner(left: LockOwner, right: LockOwner): boolean {
  return (
    left.pid === right.pid &&
    left.host === right.host &&
    left.token === right.token &&
    left.createdAt === right.createdAt
  );
}
function sameIdentity(left: LockIdentity, right: LockIdentity): boolean {
  return (
    left.device === right.device &&
    left.inode === right.inode &&
    left.ownerDevice === right.ownerDevice &&
    left.ownerInode === right.ownerInode &&
    sameOwner(left.owner, right.owner)
  );
}

class DeliveryGuardBusyError extends Error {
  constructor() {
    super(
      'Delivery lock acquisition or recovery is busy. Inspect .anhedral/ship.guard before retrying.',
    );
  }
}
/** This synchronous guard covers only filesystem transitions. An uncertain guard
 * after process termination is preserved for operator inspection, never auto-unlinked. */
function withLockGuard<T>(state: string, operation: () => T): T {
  try {
    const stat = lstatSync(state);
    if (
      !stat.isDirectory() ||
      stat.isSymbolicLink() ||
      realpathSync(state) !== state ||
      (process.platform !== 'win32' && stat.mode & 0o022)
    )
      throw new Error();
  } catch {
    throw ownerChanged();
  }
  const file = path.join(state, 'ship.guard');
  let descriptor: number;
  try {
    descriptor = openSync(file, 'wx', 0o600);
  } catch {
    throw new DeliveryGuardBusyError();
  }
  const stat = fstatSync(descriptor);
  const owner = lockOwner();
  try {
    writeFileSync(descriptor, JSON.stringify(owner) + '\n');
    return operation();
  } finally {
    closeSync(descriptor);
    // Another process must never lose its guard because this invocation finishes.
    let current;
    try {
      current = lstatSync(file);
    } catch {
      throw ownerChanged();
    }
    if (
      current.isSymbolicLink() ||
      current.dev !== stat.dev ||
      current.ino !== stat.ino ||
      !sameOwner(privateOwner(file), owner)
    )
      throw ownerChanged();
    unlinkSync(file);
  }
}
function removeOwnedLock(lock: string, identity: LockIdentity): void {
  if (!sameIdentity(snapshotLock(lock).identity, identity)) throw ownerChanged();
  // Never recursively remove a lock: unknown additional files are evidence.
  unlinkSync(path.join(lock, 'owner.json'));
  rmdirSync(lock);
}

async function releaseApplicationLock(
  state: string,
  lock: string,
  identity: LockIdentity,
): Promise<void> {
  // A simultaneous operator inspection may briefly hold the guard. Preserve our
  // lock while waiting; never bypass a guard or reinterpret uncertain ownership.
  for (let attempt = 0; ; attempt++) {
    try {
      withLockGuard(state, () => removeOwnedLock(lock, identity));
      return;
    } catch (error) {
      if (!(error instanceof DeliveryGuardBusyError) || attempt >= 4) throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, 25));
    }
  }
}

/** Explicit local cleanup only. A dead same-host PID is required; live, foreign,
 * malformed and legacy locks remain intact. Provider operations are never replayed. */
export function recoverDeliveryLock(root: string) {
  root = realpathSync(root);
  const state = privateState(root);
  return withLockGuard(state, () => {
    const lock = path.join(state, 'ship.lock');
    if (!lstatSync(lock, { throwIfNoEntry: false }))
      return {
        schemaVersion: 1,
        state: 'unlocked',
        recovered: false,
        mutation: 'local-lock-only',
        providerReplay: false,
      };
    const snapshot = snapshotLock(lock);
    if (snapshot.owner.host !== hostname())
      throw new Error(
        'Delivery lock belongs to another host; preserve it and inspect operation evidence.',
      );
    let dead = false;
    try {
      process.kill(snapshot.owner.pid, 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') dead = true;
      else throw new Error('Cannot prove the delivery lock owner exited; preserve the lock.');
    }
    if (!dead)
      throw new Error(
        'Delivery lock owner is still running; no lock or provider state was changed.',
      );
    removeOwnedLock(lock, snapshot.identity);
    return {
      schemaVersion: 1,
      state: 'lock-recovered',
      recovered: true,
      mutation: 'local-lock-only',
      providerReplay: false,
      nextAction:
        'Inspect provider status and recorded receipts before retrying ship. No provider operation was replayed.',
    };
  });
}

export async function withApplicationLock<T>(
  root: string,
  operation: () => Promise<T>,
): Promise<T> {
  root = realpathSync(root);
  const held = applicationLocks.getStore();
  const state = privateState(root);
  const lock = path.join(state, 'ship.lock');
  if (held?.active && held.root === root) {
    if (!sameIdentity(snapshotLock(lock).identity, held.identity)) throw ownerChanged();
    return operation();
  }
  const identity = withLockGuard(state, () => {
    try {
      mkdirSync(lock, { mode: 0o700 });
    } catch {
      throw lockBusy();
    }
    writeFileSync(path.join(lock, 'owner.json'), JSON.stringify(lockOwner()) + '\n', {
      flag: 'wx',
      mode: 0o600,
    });
    return snapshotLock(lock).identity;
  });
  const context: HeldApplicationLock = { root, active: true, identity };
  try {
    return await applicationLocks.run(context, operation);
  } finally {
    context.active = false;
    await releaseApplicationLock(state, lock, identity);
  }
}
