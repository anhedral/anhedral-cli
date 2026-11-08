import { lstatSync, mkdirSync, readdirSync, rmSync, rmdirSync } from 'node:fs';
import path from 'node:path';
import { readBoundedFile } from '../bounded-file.js';
import {
  fingerprintEntry,
  lstatIfPresent,
  pathEntryExists,
  removeEntryDurably,
  renameDurably,
  syncDirectory,
} from './durable-files.js';
import { removeJournal, validateJournal, writeJournal } from './journal.js';
import { acquireTransactionLock, releaseTransactionLock } from './lock.js';
import {
  JOURNAL_FILE,
  LOCAL_TRANSACTION_ROOT_PATTERN,
  TRANSACTION_DIRECTORY,
  type JournalEntry,
  type TransactionJournal,
} from './model.js';
import { assertNoSymlinkComponents, resolveTransactionPath } from './paths.js';

export function removeEmptyTransactionDirectory(root: string): void {
  const transactionDirectory = path.join(path.resolve(root), TRANSACTION_DIRECTORY);
  try {
    rmdirSync(transactionDirectory);
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    // Preserve rejected files/symlinks and the original namespace validation error.
    if (!['ENOENT', 'ENOTDIR', 'ENOTEMPTY', 'EEXIST'].includes(code ?? '')) throw error;
  }
}

export function cleanupOrphanTransactionRoots(root: string): void {
  const transactionDirectory = path.join(path.resolve(root), TRANSACTION_DIRECTORY);
  const namespaceStat = lstatIfPresent(transactionDirectory);
  if (!namespaceStat) return;
  if (namespaceStat.isSymbolicLink() || !namespaceStat.isDirectory()) {
    throw new Error(
      `Unsafe reserved transaction namespace requires manual inspection: ${transactionDirectory}`,
    );
  }
  for (const entry of readdirSync(transactionDirectory)) {
    if (!LOCAL_TRANSACTION_ROOT_PATTERN.test(entry)) {
      throw new Error(
        `Unknown artifact in reserved transaction namespace requires manual inspection: ${path.join(transactionDirectory, entry)}`,
      );
    }
    const candidate = path.join(transactionDirectory, entry);
    const stat = lstatIfPresent(candidate);
    if (!stat) continue;
    if (stat.isSymbolicLink() || !stat.isDirectory()) {
      throw new Error(`Unsafe orphan transaction root requires manual inspection: ${candidate}`);
    }
    rmSync(candidate, { recursive: true });
  }
  removeEmptyTransactionDirectory(root);
}

function restoreInstalledEntry(
  root: string,
  journal: TransactionJournal,
  entry: JournalEntry,
  target: string,
): void {
  if (entry.installed) {
    if (pathEntryExists(target)) {
      if (entry.installedFingerprint === null) {
        throw new Error(
          `Installed transaction path has no trusted fingerprint: ${entry.relativePath}. ` +
            'Recovery stopped without modifying it; inspect the journal, target, and backup manually.',
        );
      }
      const actualFingerprint = fingerprintEntry(target);
      if (actualFingerprint !== entry.installedFingerprint) {
        throw new Error(
          `Installed transaction path changed after an interrupted commit: ${entry.relativePath}. ` +
            'Recovery stopped without modifying it; inspect the journal, target, and backup manually.',
        );
      }
    }
    removeEntryDurably(target);
    entry.installed = false;
    entry.installedFingerprint = null;
    writeJournal(root, journal);
  }
}

export function restoreJournal(root: string, journal: TransactionJournal): void {
  for (const entry of [...journal.entries].reverse()) {
    assertNoSymlinkComponents(root, entry.relativePath);
    const target = resolveTransactionPath(root, entry.relativePath);
    restoreInstalledEntry(root, journal, entry, target);
    if (entry.backupPath) {
      assertNoSymlinkComponents(journal.backupRoot, entry.relativePath);
      if (pathEntryExists(entry.backupPath)) {
        if (pathEntryExists(target))
          throw new Error(
            `Transaction recovery target was recreated: ${entry.relativePath}. Recovery stopped without modifying it; preserve the journal, target and backup for manual inspection.`,
          );
        const backupFingerprint = fingerprintEntry(entry.backupPath);
        if (entry.backupFingerprint && entry.backupFingerprint !== backupFingerprint)
          throw new Error(
            `Transaction backup changed: ${entry.relativePath}. Preserve the journal and backup for manual inspection.`,
          );
        // Persist original identity before restore so a crash after rename can be replayed.
        entry.backupFingerprint = backupFingerprint;
        writeJournal(root, journal);
        mkdirSync(path.dirname(target), { recursive: true });
        renameDurably(entry.backupPath, target, root);
      } else if (
        !pathEntryExists(target) ||
        !entry.backupFingerprint ||
        fingerprintEntry(target) !== entry.backupFingerprint
      ) {
        throw new Error(
          `Cannot recover missing transaction backup or unverified target: ${entry.backupPath}. Recovery stopped; preserve the journal and target for manual inspection.`,
        );
      }
      entry.backupPath = null;
      delete entry.backupFingerprint;
      writeJournal(root, journal);
    }
  }
  for (const relativePath of [...journal.createdDirectories].sort(
    (left, right) => right.split('/').length - left.split('/').length || right.localeCompare(left),
  )) {
    assertNoSymlinkComponents(root, relativePath);
    const target = resolveTransactionPath(root, relativePath);
    try {
      rmdirSync(target);
      syncDirectory(path.dirname(target));
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (!['ENOENT', 'ENOTEMPTY', 'EEXIST'].includes(code ?? '')) throw error;
    }
  }
  removeJournal(root);
  rmSync(journal.stageRoot, { recursive: true, force: true });
  rmSync(journal.backupRoot, { recursive: true, force: true });
  removeEmptyTransactionDirectory(root);
}

export function recoverInterruptedTransactionUnlocked(root: string): boolean {
  const journalPath = path.join(root, JOURNAL_FILE);
  if (!pathEntryExists(journalPath)) return false;
  if (lstatSync(journalPath).isSymbolicLink()) {
    throw new Error(`Refusing symbolic-link transaction journal at ${journalPath}.`);
  }

  const journal = validateJournal(
    root,
    JSON.parse(readBoundedFile(journalPath, 16 * 1024 * 1024).toString('utf8')),
  );
  restoreJournal(root, journal);
  return true;
}

/** Recover an interrupted commit while holding the same lock used by normal transactions. */
export function recoverInterruptedTransaction(root: string): boolean {
  const lock = acquireTransactionLock(root);
  try {
    const recovered = recoverInterruptedTransactionUnlocked(root);
    cleanupOrphanTransactionRoots(root);
    return recovered;
  } finally {
    releaseTransactionLock(lock);
  }
}
