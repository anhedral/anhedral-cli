import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { lstat, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { CliArgumentError } from './cli-arguments.js';
import { CliFailure } from './cli-errors.js';

export type PlatformFailureCategory = ConstructorParameters<typeof CliFailure>[3];
export const platformFailure = (
  message: string,
  nextAction = 'Run anhedral login --help.',
  category: PlatformFailureCategory = 'context',
  retryable = false,
) => new CliFailure(message, 'PLATFORM_ACCESS_FAILED', nextAction, category, retryable);
export function platformOrigin(value = 'https://platform.anhedral.com') {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new CliArgumentError(
      'Choose a valid HTTPS API origin with --api-url.',
      'Run anhedral login --help.',
    );
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['127.0.0.1', '[::1]'].includes(url.hostname)))
  )
    throw new CliArgumentError(
      'Choose an HTTPS API origin (literal loopback is allowed for local testing).',
      'Run anhedral login --help.',
    );
  return url.origin;
}
async function safeDirectory(path: string, privateMode = true): Promise<void> {
  const parent = dirname(path);
  if (parent !== path) {
    const info = await lstat(parent).catch(() => null);
    if (!info) await safeDirectory(parent, false);
    else if (info.isSymbolicLink() || !info.isDirectory())
      throw platformFailure('State directory is unsafe.');
  }
  await mkdir(path, { mode: 0o700 }).catch(async (error) => {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
  });
  const info = await lstat(path);
  if (
    !info.isDirectory() ||
    info.isSymbolicLink() ||
    (privateMode &&
      process.platform !== 'win32' &&
      ((info.mode & 0o077) !== 0 || info.uid !== process.getuid?.()))
  )
    throw platformFailure('State directory must be owned by you with mode 0700.');
}
export async function readPrivate(path: string): Promise<unknown | null> {
  // Validate every existing ancestor before following it.
  for (let p = dirname(path); ; p = dirname(p)) {
    const info = await lstat(p).catch(() => null);
    if (info?.isSymbolicLink() || (info && !info.isDirectory()))
      throw platformFailure('State directory is unsafe.');
    if (dirname(p) === p) break;
  }
  const info = await lstat(path).catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!info) return null;
  if (
    !info.isFile() ||
    info.isSymbolicLink() ||
    info.size > 65536 ||
    (process.platform !== 'win32' && ((info.mode & 0o077) !== 0 || info.uid !== process.getuid?.()))
  )
    throw platformFailure('State file must be owned by you with mode 0600.');
  const text = await readFile(path, 'utf8');
  try {
    return JSON.parse(text);
  } catch {
    throw platformFailure(
      'Saved Platform state is not valid JSON. Preserve the file and reconcile the selected context.',
      'Run anhedral whoami --context --help.',
    );
  }
}
export async function writePrivate(path: string, data: unknown) {
  await safeDirectory(dirname(path));
  await readPrivate(path);
  const temp = join(dirname(path), `.state-${randomUUID()}`);
  try {
    await writeFile(temp, JSON.stringify(data) + '\n', { mode: 0o600, flag: 'wx' });
    await rename(temp, path);
  } finally {
    await unlink(temp).catch(() => {});
  }
}
export interface SecretStore {
  read(): Promise<unknown | null>;
  write(data: unknown): Promise<void>;
  clear(): Promise<void>;
}
function processInput(binary: string, args: string[], input = ''): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let result = '';
    child.stdout.on('data', (data) => {
      result += data;
      if (result.length > 65536) child.kill();
    });
    child.on('error', () =>
      reject(
        platformFailure(
          'System credential storage is unavailable. Choose an explicit --credential-file if needed.',
        ),
      ),
    );
    child.on('close', (code) =>
      code === 0
        ? resolve(result.trim())
        : reject(platformFailure('System credential storage could not be accessed.')),
    );
    child.stdin.on('error', () => {});
    child.stdin.end(input);
  });
}
export function secretStore(origin: string, file?: string): SecretStore {
  if (file && process.platform === 'win32')
    throw platformFailure(
      'Secure Windows credential storage is not implemented. Use macOS Keychain or Linux Secret Service for this preview.',
    );
  if (file)
    return {
      read: () => readPrivate(file),
      write: (data) => writePrivate(file, data),
      clear: async () => {
        await readPrivate(file);
        await unlink(file).catch((e) => {
          if (e.code !== 'ENOENT') throw e;
        });
      },
    };
  const account = createHash('sha256').update(origin).digest('hex');
  if (process.platform === 'darwin') {
    // -i reads commands on stdin, keeping secret values out of process argv.
    const run = (command: string) => processInput('/usr/bin/security', ['-i'], command + '\n');
    const quote = (v: string) => '"' + v.replaceAll('\\', '\\\\').replaceAll('"', '\\"') + '"';
    return {
      read: async () => {
        try {
          return JSON.parse(
            await processInput('/usr/bin/security', [
              'find-generic-password',
              '-s',
              'dev.anhedral.cli.v1',
              '-a',
              account,
              '-w',
            ]),
          );
        } catch {
          return null;
        }
      },
      write: async (data) => {
        await run(
          `add-generic-password -U -s dev.anhedral.cli.v1 -a ${account} -w ${quote(JSON.stringify(data))}`,
        );
        const stored = await processInput('/usr/bin/security', [
          'find-generic-password',
          '-s',
          'dev.anhedral.cli.v1',
          '-a',
          account,
          '-w',
        ]);
        if (stored !== JSON.stringify(data))
          throw platformFailure('Credential storage could not be verified.');
      },
      clear: async () => {
        await processInput('/usr/bin/security', [
          'delete-generic-password',
          '-s',
          'dev.anhedral.cli.v1',
          '-a',
          account,
        ]).catch(() => {});
      },
    };
  }
  if (process.platform === 'linux')
    return {
      read: async () => {
        const value = await processInput('secret-tool', [
          'lookup',
          'service',
          'dev.anhedral.cli.v1',
          'origin',
          account,
        ]).catch(() => '');
        return value ? JSON.parse(value) : null;
      },
      write: async (data) => {
        await processInput(
          'secret-tool',
          ['store', '--label=Anhedral CLI', 'service', 'dev.anhedral.cli.v1', 'origin', account],
          JSON.stringify(data),
        );
      },
      clear: async () => {
        await processInput('secret-tool', [
          'clear',
          'service',
          'dev.anhedral.cli.v1',
          'origin',
          account,
        ]).catch(() => {});
      },
    };
  throw platformFailure('Secure credential storage is unsupported on this platform.');
}
