import { randomUUID } from 'node:crypto';
import {
  existsSync,
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
export function readConfig(directory: string): Record<string, unknown> {
  const errors: ParseError[] = [];
  const value = parse(readFileSync(path.join(directory, 'wrangler.jsonc'), 'utf8'), errors);
  if (errors.length || !value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid Wrangler JSONC configuration.');
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
    .filter((entry) => existsSync(path.join(root, 'apps', entry.name, 'wrangler.jsonc')))
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
export const defaultRunner: DeliveryRunner = (command, args, cwd, env) =>
  new Promise((resolve, reject) => {
    const invocation = resolveCommand(command, args);
    const child = spawn(invocation.command, invocation.args, {
      cwd,
      env,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
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
    child.stdout.on('data', (chunk: Buffer) => {
      if (!oversized) output += chunk.toString();
      if (output.length > 8 * 1024 * 1024) {
        oversized = true;
        stop();
      }
    });
    // Do not persist raw build/provider output: it can contain credentials or customer data.
    child.stderr.resume();
    const timer = setTimeout(
      () => {
        timedOut = true;
        stop();
      },
      20 * 60 * 1000,
    );
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
export async function withApplicationLock<T>(
  root: string,
  operation: () => Promise<T>,
): Promise<T> {
  root = realpathSync(root);
  const state = path.join(root, stateDirectory);
  mkdirSync(state, { recursive: true });
  if (realpathSync(state) !== path.join(root, stateDirectory))
    throw new Error('Delivery state directory must not be a symbolic link.');
  const lock = path.join(state, 'ship.lock');
  try {
    mkdirSync(lock);
  } catch {
    throw new Error(
      'Another delivery is running or was interrupted. Inspect provider status and remove .anhedral/ship.lock only after confirming no delivery is active.',
    );
  }
  try {
    return await operation();
  } finally {
    rmSync(lock, { recursive: true, force: true });
  }
}
