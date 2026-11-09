import { createHash } from 'node:crypto';
import {
  closeSync,
  fsyncSync,
  lstatSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
} from 'node:fs';
import path from 'node:path';

export function lstatIfPresent(target: string): ReturnType<typeof lstatSync> | null {
  try {
    return lstatSync(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

type DirectorySyncOperation = 'open' | 'fsync';

function isUnsupportedDirectorySync(error: unknown, operation: DirectorySyncOperation): boolean {
  const code = (error as NodeJS.ErrnoException).code;
  if (['ENOTSUP', 'EOPNOTSUPP'].includes(code ?? '')) return true;

  // Some filesystems expose directories as readable handles but reject fsync.
  // Windows may reject opening or syncing directory handles altogether. Keep
  // these narrowly scoped so permission and I/O failures remain actionable.
  if (operation === 'fsync' && code === 'EINVAL') return true;
  if (process.platform !== 'win32') return false;
  const windowsCodes = operation === 'open' ? ['EISDIR', 'EPERM'] : ['EBADF', 'EPERM'];
  return windowsCodes.includes(code ?? '');
}

export function syncDirectory(directory: string): void {
  let descriptor: number;
  try {
    descriptor = openSync(directory, 'r');
  } catch (error) {
    if (isUnsupportedDirectorySync(error, 'open')) return;
    throw error;
  }

  try {
    try {
      fsyncSync(descriptor);
    } catch (error) {
      if (!isUnsupportedDirectorySync(error, 'fsync')) throw error;
    }
  } finally {
    closeSync(descriptor);
  }
}

function directoryChainToRoot(directory: string, root: string): string[] {
  const resolvedRoot = path.resolve(root);
  let cursor = path.resolve(directory);
  if (cursor !== resolvedRoot && !cursor.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Cannot sync transaction directory outside its root: ${directory}`);
  }

  const directories: string[] = [];
  while (true) {
    directories.push(cursor);
    if (cursor === resolvedRoot) return directories;
    cursor = path.dirname(cursor);
  }
}

function syncDirectories(directories: readonly string[]): void {
  const seen = new Set<string>();
  for (const directory of directories) {
    const resolved = path.resolve(directory);
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    syncDirectory(resolved);
  }
}

export function syncEntryRecursively(target: string): void {
  const stat = lstatSync(target);
  if (stat.isDirectory()) {
    for (const entry of readdirSync(target)) syncEntryRecursively(path.join(target, entry));
    syncDirectory(target);
    return;
  }
  if (!stat.isFile()) return;

  // Windows FlushFileBuffers requires a handle opened with write access. The
  // staged file is owned by this transaction, so opening it read/write retains
  // the durability guarantee instead of treating EPERM as an unsupported sync.
  const descriptor = openSync(target, process.platform === 'win32' ? 'r+' : 'r');
  try {
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }
}

export function renameDurably(source: string, target: string, root: string): void {
  renameSync(source, target);
  const targetDirectories = directoryChainToRoot(path.dirname(target), root);
  const sourceParent = path.dirname(source);
  syncDirectories([...targetDirectories, sourceParent]);
}

export function removeEntryDurably(target: string): void {
  rmSync(target, { recursive: true, force: true });
  const parent = path.dirname(target);
  if (lstatIfPresent(parent)) syncDirectory(parent);
}

export function pathEntryExists(target: string): boolean {
  return lstatIfPresent(target) !== null;
}

export function fingerprintEntry(target: string): string {
  const hash = createHash('sha256');
  const visit = (absolutePath: string, relativePath: string): void => {
    const stat = lstatSync(absolutePath);
    const mode = stat.mode & 0o7777;
    if (stat.isDirectory()) {
      hash.update(`directory\0${relativePath}\0${mode}\0`);
      for (const entry of readdirSync(absolutePath).sort()) {
        visit(
          path.join(absolutePath, entry),
          relativePath === '.' ? entry : `${relativePath}/${entry}`,
        );
      }
      return;
    }
    if (stat.isFile()) {
      hash.update(`file\0${relativePath}\0${mode}\0${stat.size}\0`);
      hash.update(readFileSync(absolutePath));
      return;
    }
    throw new Error(`Cannot fingerprint unsupported transaction entry: ${absolutePath}`);
  };
  visit(target, '.');
  return hash.digest('hex');
}
