import { linkSync, lstatSync, readdirSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { readBoundedFile } from './bounded-file.js';

export const LOCK_FILE = '.anhedral.lock';

type LockOwner = {
  version: 1;
  pid: number;
  hostname: string;
  token: string;
  createdAt: string;
};

type TransactionLock = {
  lockPath: string;
  owner: LockOwner;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function lstatIfPresent(target: string): ReturnType<typeof lstatSync> | null {
  try {
    return lstatSync(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

function pathEntryExists(target: string): boolean {
  return lstatIfPresent(target) !== null;
}

function parseLockOwner(lockPath: string): LockOwner {
  if (lstatSync(lockPath).isSymbolicLink()) {
    throw new Error(`Refusing symbolic-link transaction lock at ${lockPath}.`);
  }
  let value: unknown;
  try {
    value = JSON.parse(readBoundedFile(lockPath, 16 * 1024).toString('utf8'));
  } catch (error) {
    throw new Error(
      `Cannot read transaction lock owner at ${lockPath}; remove it only after confirming no Anhedral process is running.`,
      { cause: error },
    );
  }
  if (
    !isRecord(value) ||
    value.version !== 1 ||
    !Number.isSafeInteger(value.pid) ||
    (value.pid as number) <= 0 ||
    typeof value.hostname !== 'string' ||
    typeof value.token !== 'string' ||
    typeof value.createdAt !== 'string'
  ) {
    throw new Error(
      `Invalid transaction lock owner at ${lockPath}; remove it only after confirming no Anhedral process is running.`,
    );
  }
  return value as LockOwner;
}

function readLockOwnerIfPresent(lockPath: string): LockOwner | null {
  try {
    return parseLockOwner(lockPath);
  } catch (error) {
    const candidate = error as NodeJS.ErrnoException & { cause?: NodeJS.ErrnoException };
    if (candidate.code === 'ENOENT' || candidate.cause?.code === 'ENOENT') return null;
    throw error;
  }
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ESRCH') return false;
    if (code === 'EPERM') return true;
    throw error;
  }
}

function cleanupTemporaryLocks(root: string, owner: LockOwner, temporaryPath: string): void {
  for (const entry of readdirSync(root)) {
    if (!entry.startsWith(`${LOCK_FILE}.`) || !entry.endsWith('.tmp')) continue;
    const staleTemporaryPath = path.join(root, entry);
    if (staleTemporaryPath === temporaryPath) continue;
    let temporaryOwner: LockOwner;
    try {
      temporaryOwner = parseLockOwner(staleTemporaryPath);
    } catch (error) {
      throw new Error(
        `Cannot safely classify transaction lock artifact at ${staleTemporaryPath}; inspect it manually before retrying.`,
        { cause: error },
      );
    }
    if (temporaryOwner.hostname !== owner.hostname) {
      throw new Error(
        `Transaction lock artifact at ${staleTemporaryPath} belongs to another host; inspect it manually before retrying.`,
      );
    }
    if (!isProcessAlive(temporaryOwner.pid)) {
      unlinkSync(staleTemporaryPath);
    }
  }
}

function claimReclamation(
  lockPath: string,
  reclaimPath: string,
  temporaryPath: string,
  owner: LockOwner,
): boolean {
  try {
    linkSync(temporaryPath, reclaimPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      const reclaimer = readLockOwnerIfPresent(reclaimPath);
      if (!reclaimer) {
        return false;
      }
      if (reclaimer.hostname === owner.hostname && !isProcessAlive(reclaimer.pid)) {
        unlinkSync(reclaimPath);
        return false;
      }
      throw new Error(
        `A stale Anhedral lock is being recovered (${lockPath}, pid ${reclaimer.pid} on ${reclaimer.hostname}); retry the command.`,
      );
    }
    throw error;
  }

  return true;
}

function reclaimTransactionLock(
  lockPath: string,
  reclaimPath: string,
  temporaryPath: string,
  owner: LockOwner,
): 'retry' | 'next' {
  const existing = readLockOwnerIfPresent(lockPath);
  if (!existing) {
    return 'retry';
  }
  if (existing.hostname !== owner.hostname || isProcessAlive(existing.pid)) {
    throw new Error(
      `Another Anhedral operation is already running (${lockPath}, pid ${existing.pid} on ${existing.hostname}).`,
    );
  }

  if (!claimReclamation(lockPath, reclaimPath, temporaryPath, owner)) return 'retry';

  try {
    if (!pathEntryExists(lockPath)) return 'next';
    const current = parseLockOwner(lockPath);
    if (current.token !== existing.token) return 'next';
    if (current.hostname !== owner.hostname || isProcessAlive(current.pid)) {
      throw new Error(
        `Another Anhedral operation is already running (${lockPath}, pid ${current.pid} on ${current.hostname}).`,
      );
    }
    unlinkSync(lockPath);
  } finally {
    if (pathEntryExists(reclaimPath)) {
      const reclaimer = parseLockOwner(reclaimPath);
      if (reclaimer.token === owner.token) unlinkSync(reclaimPath);
    }
  }
  return 'next';
}

function assertLockRoot(root: string): void {
  const rootStat = lstatIfPresent(root);
  if (!rootStat) throw new Error(`Transaction root is not a directory: ${root}`);
  if (rootStat.isSymbolicLink()) {
    throw new Error(`Refusing transaction root that is a symbolic link: ${root}`);
  }
  if (!rootStat.isDirectory()) throw new Error(`Transaction root is not a directory: ${root}`);
}

function clearDeadReclaimer(lockPath: string, reclaimPath: string, owner: LockOwner): boolean {
  const activeReclaimer = readLockOwnerIfPresent(reclaimPath);
  if (activeReclaimer) {
    if (activeReclaimer.hostname === owner.hostname && !isProcessAlive(activeReclaimer.pid)) {
      try {
        unlinkSync(reclaimPath);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
      return true;
    }
    throw new Error(
      `An Anhedral lock is being recovered (${lockPath}, pid ${activeReclaimer.pid} on ${activeReclaimer.hostname}); retry the command.`,
    );
  }
  return false;
}

function cleanupAcquiredLock(
  root: string,
  lockPath: string,
  owner: LockOwner,
  temporaryPath: string,
): void {
  try {
    cleanupTemporaryLocks(root, owner, temporaryPath);
  } catch (error) {
    const current = readLockOwnerIfPresent(lockPath);
    if (current?.token === owner.token) unlinkSync(lockPath);
    throw error;
  }
}

export function acquireTransactionLock(root: string): TransactionLock {
  assertLockRoot(root);
  const lockPath = path.join(root, LOCK_FILE);
  const reclaimPath = `${lockPath}.reclaim`;
  const owner: LockOwner = {
    version: 1,
    pid: process.pid,
    hostname: os.hostname(),
    token: `${process.pid}-${randomUUID()}`,
    createdAt: new Date().toISOString(),
  };
  const temporaryPath = `${lockPath}.${owner.token}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(owner) + '\n', {
    encoding: 'utf8',
    flag: 'wx',
    mode: 0o600,
  });

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      if (clearDeadReclaimer(lockPath, reclaimPath, owner)) {
        attempt -= 1;
        continue;
      }

      try {
        linkSync(temporaryPath, lockPath);
        cleanupAcquiredLock(root, lockPath, owner, temporaryPath);
        return { lockPath, owner };
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      }

      if (reclaimTransactionLock(lockPath, reclaimPath, temporaryPath, owner) === 'retry')
        attempt -= 1;
    }
  } finally {
    rmSync(temporaryPath, { force: true });
  }

  throw new Error(`Could not acquire Anhedral transaction lock (${lockPath}).`);
}

export function releaseTransactionLock(lock: TransactionLock): void {
  if (!pathEntryExists(lock.lockPath)) return;
  const current = parseLockOwner(lock.lockPath);
  if (current.token === lock.owner.token) unlinkSync(lock.lockPath);
}
