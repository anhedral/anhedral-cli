import { lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { lstatIfPresent } from './durable-files.js';
import { LOCK_FILE } from './lock.js';
import { JOURNAL_FILE, LOCAL_TRANSACTION_ROOT_PATTERN, TRANSACTION_DIRECTORY } from './model.js';

export function assertRelativePath(relativePath: string): void {
  const normalized = path.normalize(relativePath);
  const rawSegments = relativePath.split(/[\\/]/);
  if (
    !relativePath ||
    relativePath.includes('\0') ||
    relativePath.includes('\\') ||
    path.isAbsolute(relativePath) ||
    rawSegments.some((segment) => segment === '' || segment === '.' || segment === '..') ||
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith(`..${path.sep}`) ||
    normalized.split(path.sep).includes('..') ||
    rawSegments[0] === TRANSACTION_DIRECTORY ||
    rawSegments[0] === LOCK_FILE ||
    rawSegments[0] === JOURNAL_FILE
  ) {
    throw new Error(`Unsafe transaction path: ${relativePath}`);
  }
}

export function resolveTransactionPath(root: string, relativePath: string): string {
  assertRelativePath(relativePath);
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (!resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Unsafe transaction path: ${relativePath}`);
  }
  return resolved;
}

function ancestorInSet(relativePath: string, candidates: ReadonlySet<string>): string | null {
  const segments = relativePath.split('/');
  for (let index = 1; index < segments.length; index += 1) {
    const ancestor = segments.slice(0, index).join('/');
    if (candidates.has(ancestor)) return ancestor;
  }
  return null;
}

export function assertNoPathAncestry(paths: readonly string[], context: string): void {
  const seen = new Set<string>();
  const ordered = [...paths].sort(
    (left, right) => left.split('/').length - right.split('/').length || left.localeCompare(right),
  );
  for (const relativePath of ordered) {
    assertRelativePath(relativePath);
    const ancestor = ancestorInSet(relativePath, seen);
    if (ancestor) {
      throw new Error(
        `Ambiguous transaction ${context}: ${ancestor} is an ancestor of ${relativePath}.`,
      );
    }
    seen.add(relativePath);
  }
}

export function normalizeTransactionPaths(
  rawCommitPaths: readonly string[],
  rawDeletePaths: readonly string[],
): { commitPaths: string[]; deletePaths: string[]; uniquePaths: string[] } {
  const commitPaths = [...new Set(rawCommitPaths)];
  for (const relativePath of commitPaths) assertRelativePath(relativePath);
  assertNoPathAncestry(commitPaths, 'write paths');

  const deleteCandidates = [...new Set(rawDeletePaths)];
  for (const relativePath of deleteCandidates) assertRelativePath(relativePath);
  deleteCandidates.sort(
    (left, right) => left.split('/').length - right.split('/').length || left.localeCompare(right),
  );
  const deleteSet = new Set<string>();
  const deletePaths = deleteCandidates.filter((candidate) => {
    if (ancestorInSet(candidate, deleteSet)) return false;
    deleteSet.add(candidate);
    return true;
  });

  const deleteAncestorPaths = new Set<string>();
  for (const deleted of deletePaths) {
    const segments = deleted.split('/');
    for (let index = 1; index < segments.length; index += 1) {
      deleteAncestorPaths.add(segments.slice(0, index).join('/'));
    }
  }
  for (const written of commitPaths) {
    const deletedAncestor = ancestorInSet(written, deleteSet);
    if (deleteSet.has(written) || deletedAncestor || deleteAncestorPaths.has(written)) {
      throw new Error(
        `Ambiguous transaction write/delete paths include ${written}` +
          (deletedAncestor ? ` below ${deletedAncestor}` : ''),
      );
    }
  }

  const uniquePaths = [...commitPaths, ...deletePaths].sort();
  return { commitPaths, deletePaths, uniquePaths };
}

type TemporaryRootIdentity = {
  token: string;
};

function assertExpectedTempRoot(
  root: string,
  candidate: string,
  kind: 'stage' | 'backup',
): TemporaryRootIdentity {
  const resolved = path.resolve(candidate);
  const tokenPattern =
    '(\\d+-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})';
  const localParent = path.join(path.resolve(root), TRANSACTION_DIRECTORY);
  const localMatch = new RegExp(`^${kind}-${tokenPattern}$`, 'i').exec(path.basename(resolved));
  if (path.dirname(resolved) === localParent && localMatch) {
    const namespaceStat = lstatIfPresent(localParent);
    if (namespaceStat && (namespaceStat.isSymbolicLink() || !namespaceStat.isDirectory())) {
      throw new Error(`Unsafe reserved transaction namespace: ${localParent}`);
    }
    return { token: localMatch[1]! };
  }

  throw new Error(`Unsafe transaction ${kind} root: ${candidate}`);
}

export function assertNoSymlinkComponents(root: string, relativePath: string): void {
  resolveTransactionPath(root, relativePath);
  let cursor = path.resolve(root);
  if (lstatIfPresent(cursor)?.isSymbolicLink()) {
    throw new Error(`Refusing transaction root that is a symbolic link: ${root}`);
  }
  for (const segment of relativePath.split('/')) {
    cursor = path.join(cursor, segment);
    if (lstatIfPresent(cursor)?.isSymbolicLink()) {
      throw new Error(`Refusing transaction path containing a symbolic link: ${relativePath}`);
    }
  }
}

export function assertNoSymlinksRecursively(target: string): void {
  const stat = lstatSync(target);
  if (stat.isSymbolicLink()) throw new Error(`Refusing symbolic link in staged output: ${target}`);
  if (!stat.isDirectory()) return;
  for (const entry of readdirSync(target)) assertNoSymlinksRecursively(path.join(target, entry));
}

export function assertJournalRoots(root: string, backupRoot: string, stageRoot: string): void {
  const backupIdentity = assertExpectedTempRoot(root, backupRoot, 'backup');
  const stageIdentity = assertExpectedTempRoot(root, stageRoot, 'stage');
  if (backupIdentity.token !== stageIdentity.token) {
    throw new Error('Transaction stage and backup roots do not share one token.');
  }
  for (const temporaryRoot of [backupRoot, stageRoot]) {
    const stat = lstatIfPresent(temporaryRoot);
    if (stat) {
      if (stat.isSymbolicLink() || !stat.isDirectory()) {
        throw new Error(`Unsafe transaction temporary root: ${temporaryRoot}`);
      }
    }
  }
}

export function assertTransactionNamespace(transactionDirectory: string): void {
  const namespaceStat = lstatIfPresent(transactionDirectory);
  if (namespaceStat && (namespaceStat.isSymbolicLink() || !namespaceStat.isDirectory())) {
    throw new Error(
      `Unsafe reserved transaction namespace requires manual inspection: ${transactionDirectory}`,
    );
  }
  if (!namespaceStat) return;
  for (const entry of readdirSync(transactionDirectory)) {
    const candidate = path.join(transactionDirectory, entry);
    const stat = lstatIfPresent(candidate);
    if (
      !LOCAL_TRANSACTION_ROOT_PATTERN.test(entry) ||
      !stat ||
      stat.isSymbolicLink() ||
      !stat.isDirectory()
    ) {
      throw new Error(
        `Unknown or unsafe artifact in reserved transaction namespace requires manual inspection: ${candidate}`,
      );
    }
  }
}
