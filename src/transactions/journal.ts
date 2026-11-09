import { randomUUID } from 'node:crypto';
import {
  closeSync,
  fsyncSync,
  openSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { syncDirectory } from './durable-files.js';
import {
  JOURNAL_FILE,
  JOURNAL_VERSION,
  type JournalEntry,
  type TransactionJournal,
} from './model.js';
import {
  assertJournalRoots,
  assertNoPathAncestry,
  assertRelativePath,
  resolveTransactionPath,
} from './paths.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertExactObjectKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
  context: string,
): void {
  const expectedKeys = new Set(expected);
  const missing = expected.filter((key) => !Object.hasOwn(value, key));
  const unknown = Object.keys(value).filter((key) => !expectedKeys.has(key));
  if (missing.length === 0 && unknown.length === 0) return;
  const details = [
    missing.length > 0 ? `missing ${missing.join(', ')}` : null,
    unknown.length > 0 ? `unknown ${unknown.join(', ')}` : null,
  ]
    .filter((entry): entry is string => entry !== null)
    .join('; ');
  throw new Error(`Invalid ${context} fields (${details}).`);
}

export function validateJournal(root: string, value: unknown): TransactionJournal {
  if (!isRecord(value) || value.version !== JOURNAL_VERSION) {
    throw new Error(
      `Cannot recover unsupported transaction journal at ${path.join(root, JOURNAL_FILE)}`,
    );
  }
  assertExactObjectKeys(
    value,
    ['version', 'backupRoot', 'stageRoot', 'entries', 'createdDirectories'],
    'transaction journal',
  );
  if (
    typeof value.backupRoot !== 'string' ||
    typeof value.stageRoot !== 'string' ||
    !Array.isArray(value.entries)
  ) {
    throw new Error(`Invalid transaction journal at ${path.join(root, JOURNAL_FILE)}`);
  }
  assertJournalRoots(root, value.backupRoot, value.stageRoot);
  const seen = new Set<string>();
  const entries = value.entries.map((entry, index): JournalEntry => {
    if (
      !isRecord(entry) ||
      typeof entry.relativePath !== 'string' ||
      typeof entry.installed !== 'boolean'
    ) {
      throw new Error(`Invalid transaction journal entry at index ${index}`);
    }
    assertExactObjectKeys(
      entry,
      [
        'relativePath',
        'backupPath',
        'installed',
        'installedFingerprint',
        ...(Object.hasOwn(entry, 'backupFingerprint') ? ['backupFingerprint'] : []),
      ],
      `transaction journal entry at index ${index}`,
    );
    assertRelativePath(entry.relativePath);
    if (seen.has(entry.relativePath))
      throw new Error(`Duplicate transaction journal path: ${entry.relativePath}`);
    seen.add(entry.relativePath);
    if (entry.backupPath !== null && typeof entry.backupPath !== 'string') {
      throw new Error(`Invalid transaction backup path at index ${index}`);
    }
    if (
      Object.hasOwn(entry, 'backupFingerprint') &&
      (typeof entry.backupFingerprint !== 'string' ||
        !/^[a-f0-9]{64}$/.test(entry.backupFingerprint))
    )
      throw new Error(`Invalid backup transaction fingerprint at index ${index}`);
    const installedFingerprint = entry.installedFingerprint;
    if (
      installedFingerprint !== null &&
      (typeof installedFingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(installedFingerprint))
    ) {
      throw new Error(`Invalid installed transaction fingerprint at index ${index}`);
    }
    if (entry.installed ? installedFingerprint === null : installedFingerprint !== null) {
      throw new Error(
        `Transaction journal entry fingerprint state is inconsistent at index ${index}`,
      );
    }
    const expectedBackup = resolveTransactionPath(value.backupRoot as string, entry.relativePath);
    if (
      entry.backupPath !== null &&
      path.resolve(entry.backupPath) !== path.resolve(expectedBackup)
    ) {
      throw new Error(`Unsafe transaction backup path: ${entry.backupPath}`);
    }
    return {
      relativePath: entry.relativePath,
      backupPath: entry.backupPath,
      ...(typeof entry.backupFingerprint === 'string'
        ? { backupFingerprint: entry.backupFingerprint }
        : {}),
      installed: entry.installed,
      installedFingerprint,
    };
  });
  assertNoPathAncestry(
    entries.map((entry) => entry.relativePath),
    'journal paths',
  );
  const rawCreatedDirectories = value.createdDirectories;
  if (!Array.isArray(rawCreatedDirectories)) {
    throw new Error(
      `Invalid transaction created-directory inventory at ${path.join(root, JOURNAL_FILE)}`,
    );
  }
  const createdDirectories = rawCreatedDirectories.map((entry, index) => {
    if (typeof entry !== 'string')
      throw new Error(`Invalid transaction created directory at index ${index}`);
    assertRelativePath(entry);
    return entry;
  });
  if (new Set(createdDirectories).size !== createdDirectories.length) {
    throw new Error('Duplicate transaction created-directory path.');
  }
  for (const directory of createdDirectories) {
    if (!entries.some((entry) => entry.relativePath.startsWith(`${directory}/`))) {
      throw new Error(
        `Transaction created directory is not a parent of any journal entry: ${directory}`,
      );
    }
  }
  return {
    version: JOURNAL_VERSION,
    backupRoot: value.backupRoot,
    stageRoot: value.stageRoot,
    entries,
    createdDirectories,
  };
}

export function writeJournal(root: string, journal: TransactionJournal): void {
  const journalPath = path.join(root, JOURNAL_FILE);
  const temporaryPath = `${journalPath}.tmp-${process.pid}-${randomUUID()}`;
  let descriptor: number | null = null;
  try {
    descriptor = openSync(temporaryPath, 'wx', 0o600);
    writeFileSync(descriptor, JSON.stringify(journal, null, 2) + '\n', { encoding: 'utf8' });
    fsyncSync(descriptor);
    const completedDescriptor = descriptor;
    descriptor = null;
    closeSync(completedDescriptor);
    renameSync(temporaryPath, journalPath);
    syncDirectory(path.dirname(journalPath));
  } finally {
    if (descriptor !== null) closeSync(descriptor);
    rmSync(temporaryPath, { force: true });
  }
}

export function removeJournal(root: string): void {
  const journalPath = path.join(root, JOURNAL_FILE);
  try {
    unlinkSync(journalPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
    throw error;
  }
  syncDirectory(path.dirname(journalPath));
}
