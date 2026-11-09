import { randomUUID } from 'node:crypto';
import { cpSync, lstatSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import {
  fingerprintEntry,
  pathEntryExists,
  renameDurably,
  syncEntryRecursively,
} from './durable-files.js';
import { removeJournal, writeJournal } from './journal.js';
import { acquireTransactionLock, releaseTransactionLock } from './lock.js';
import {
  JOURNAL_FILE,
  JOURNAL_VERSION,
  TRANSACTION_DIRECTORY,
  type JournalEntry,
  type TransactionJournal,
} from './model.js';
import {
  assertNoSymlinkComponents,
  assertNoSymlinksRecursively,
  assertRelativePath,
  assertTransactionNamespace,
  normalizeTransactionPaths,
  resolveTransactionPath,
} from './paths.js';
import {
  cleanupOrphanTransactionRoots,
  recoverInterruptedTransactionUnlocked,
  removeEmptyTransactionDirectory,
  restoreJournal,
} from './recovery.js';
export { recoverInterruptedTransaction } from './recovery.js';

/** The filesystem commit succeeded, but a follow-up action such as install failed. */
export class PostCommitError extends Error {
  readonly committedPaths: readonly string[];

  constructor(committedPaths: readonly string[], cause: unknown) {
    const causeMessage = cause instanceof Error ? cause.message : String(cause);
    super(
      `Changes were committed successfully, but the post-commit action failed: ${causeMessage}. ` +
        'The generated files were kept; resolve the failure and rerun the post-commit command.',
      { cause },
    );
    this.name = 'PostCommitError';
    this.committedPaths = Object.freeze([...committedPaths]);
  }
}

function seedTransaction(root: string, stageRoot: string, seedPaths: readonly string[]): void {
  for (const relativePath of seedPaths) {
    assertRelativePath(relativePath);
    assertNoSymlinkComponents(root, relativePath);
    const source = resolveTransactionPath(root, relativePath);
    if (!pathEntryExists(source)) continue;
    assertNoSymlinksRecursively(source);
    const target = resolveTransactionPath(stageRoot, relativePath);
    mkdirSync(path.dirname(target), { recursive: true });
    cpSync(source, target, { recursive: true, preserveTimestamps: true });
  }
}

function ensureTransactionParents(
  root: string,
  entry: JournalEntry,
  journal: TransactionJournal,
  createdDirectorySet: Set<string>,
): void {
  const segments = entry.relativePath.split('/').slice(0, -1);
  let cursor = root;
  let relativeDirectory = '';
  const missingDirectories: string[] = [];
  for (const segment of segments) {
    cursor = path.join(cursor, segment);
    relativeDirectory = relativeDirectory ? `${relativeDirectory}/${segment}` : segment;
    if (!pathEntryExists(cursor)) missingDirectories.push(relativeDirectory);
    else if (!lstatSync(cursor).isDirectory()) {
      throw new Error(`Transaction parent is not a directory: ${relativeDirectory}`);
    }
  }
  const newDirectories = missingDirectories.filter(
    (directory) => !createdDirectorySet.has(directory),
  );
  if (newDirectories.length > 0) {
    journal.createdDirectories.push(...newDirectories);
    for (const directory of newDirectories) createdDirectorySet.add(directory);
    writeJournal(root, journal);
  }
}

function commitJournal(
  root: string,
  journal: TransactionJournal,
  deletePaths: ReadonlySet<string>,
): void {
  const { stageRoot, backupRoot } = journal;
  const createdDirectorySet = new Set(journal.createdDirectories);
  for (const entry of journal.entries) {
    const source = resolveTransactionPath(stageRoot, entry.relativePath);
    const deleting = deletePaths.has(entry.relativePath);
    if (!deleting && !pathEntryExists(source)) {
      throw new Error(`Staged output is missing declared path: ${entry.relativePath}`);
    }
    if (deleting && pathEntryExists(source))
      throw new Error(`Deleted transaction path still exists in staging: ${entry.relativePath}`);
    assertNoSymlinkComponents(root, entry.relativePath);
    if (!deleting) {
      assertNoSymlinksRecursively(source);
      syncEntryRecursively(source);
    }

    const target = resolveTransactionPath(root, entry.relativePath);
    if (pathEntryExists(target)) {
      const backup = resolveTransactionPath(backupRoot, entry.relativePath);
      mkdirSync(path.dirname(backup), { recursive: true });
      entry.backupPath = backup;
      entry.backupFingerprint = fingerprintEntry(target);
      writeJournal(root, journal);
      renameDurably(target, backup, root);
    }

    if (!deleting) {
      ensureTransactionParents(root, entry, journal, createdDirectorySet);
      mkdirSync(path.dirname(target), { recursive: true });
      entry.installedFingerprint = fingerprintEntry(source);
      entry.installed = true;
      writeJournal(root, journal);
      renameDurably(source, target, root);
    }
  }
}

/**
 * Build changes away from the destination and install only the declared paths.
 * Every replaced path is journaled first, so errors and later invocations can
 * restore the original workspace.
 */
export async function runStagedTransaction(
  root: string,
  options: {
    commitPaths: string[];
    deletePaths?: string[];
    seedPaths?: string[];
    dryRun?: boolean;
    recover?: boolean;
    prepare?: () => boolean | void | Promise<boolean | void>;
    afterCommit?: () => void | Promise<void>;
    onPlan?: (paths: readonly string[]) => void;
    build: (stageRoot: string) => Promise<void>;
  },
): Promise<readonly string[]> {
  const lock = acquireTransactionLock(root);
  const token = `${process.pid}-${randomUUID()}`;
  const transactionDirectory = path.join(path.resolve(root), TRANSACTION_DIRECTORY);
  const stageRoot = path.join(transactionDirectory, `stage-${token}`);
  const backupRoot = path.join(transactionDirectory, `backup-${token}`);
  let namespaceValidated = false;

  try {
    if (options.dryRun && pathEntryExists(path.join(root, JOURNAL_FILE))) {
      throw new Error(
        'Dry-run cannot recover an interrupted transaction. Re-run the original command without --dry-run first.',
      );
    }
    if (options.recover === false && pathEntryExists(path.join(root, JOURNAL_FILE)))
      throw new Error('An interrupted transaction requires recovery before this operation.');
    recoverInterruptedTransactionUnlocked(root);
    if (!options.dryRun) cleanupOrphanTransactionRoots(root);
    if ((await options.prepare?.()) === false) return Object.freeze([]);

    assertTransactionNamespace(transactionDirectory);
    namespaceValidated = true;
    mkdirSync(stageRoot, { recursive: true, mode: 0o700 });
    mkdirSync(backupRoot, { recursive: true, mode: 0o700 });

    seedTransaction(root, stageRoot, options.seedPaths ?? []);

    await options.build(stageRoot);

    const normalizedPaths = normalizeTransactionPaths(
      options.commitPaths,
      options.deletePaths ?? [],
    );
    const deletePaths = new Set(normalizedPaths.deletePaths);
    const uniquePaths = normalizedPaths.uniquePaths;
    options.onPlan?.(Object.freeze([...uniquePaths]));
    if (options.dryRun) return Object.freeze(uniquePaths);
    const journal: TransactionJournal = {
      version: JOURNAL_VERSION,
      backupRoot,
      stageRoot,
      createdDirectories: [],
      entries: uniquePaths.map((relativePath) => {
        assertRelativePath(relativePath);
        return { relativePath, backupPath: null, installed: false, installedFingerprint: null };
      }),
    };
    writeJournal(root, journal);

    try {
      commitJournal(root, journal, deletePaths);
    } catch (error) {
      restoreJournal(root, journal);
      throw error;
    }

    removeJournal(root);
    rmSync(stageRoot, { recursive: true, force: true });
    rmSync(backupRoot, { recursive: true, force: true });
    removeEmptyTransactionDirectory(root);
    try {
      await options.afterCommit?.();
    } catch (error) {
      throw new PostCommitError(uniquePaths, error);
    }
    return Object.freeze(uniquePaths);
  } finally {
    try {
      if (namespaceValidated && !pathEntryExists(path.join(root, JOURNAL_FILE))) {
        rmSync(stageRoot, { recursive: true, force: true });
        rmSync(backupRoot, { recursive: true, force: true });
        removeEmptyTransactionDirectory(root);
      }
    } finally {
      releaseTransactionLock(lock);
    }
  }
}

/** Serialize short source updates with generation/add transactions as well as other writers. */
export function withSourceWriteLock<T>(root: string, write: () => T): T {
  const lock = acquireTransactionLock(root);
  try {
    return write();
  } finally {
    releaseTransactionLock(lock);
  }
}
