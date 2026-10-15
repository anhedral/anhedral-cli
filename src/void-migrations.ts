import { createHash } from 'node:crypto';
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

const digest = (value: Buffer) => createHash('sha256').update(value).digest('hex');

function files(directory: string, prefix = ''): string[] {
  if (!existsSync(directory)) return [];
  const result: string[] = [];
  for (const name of readdirSync(directory)) {
    const file = path.join(directory, name);
    if (lstatSync(file).isSymbolicLink())
      throw new Error('Void migration sources and generated files must not contain symlinks.');
    if (lstatSync(file).isDirectory()) result.push(...files(file, prefix + name + '/'));
    else if (lstatSync(file).isFile()) result.push(prefix + name);
    else throw new Error('Void migration sources must contain regular files.');
  }
  return result.sort();
}

function assertSafeAncestors(root: string, directory: string): void {
  const relative = path.relative(root, directory);
  if (relative.startsWith('..') || path.isAbsolute(relative))
    throw new Error('Void migration preparation must stay inside the application workspace.');
  let current = root;
  for (const component of relative.split(path.sep)) {
    current = path.join(current, component);
    if (existsSync(current) && lstatSync(current).isSymbolicLink())
      throw new Error('Void migration paths must not traverse symlinks.');
  }
}

/**
 * Void 0.27 validates conventional app db/migrations even when Wrangler applies
 * a custom directory. Mirror only the designated owner's reviewed SQL/metadata,
 * then let Void compare that validated set against packages/db/drizzle.
 */
export function prepareVoidMigrations(
  root: string,
  directory: string,
  config: Record<string, unknown>,
): void {
  const requestedRoot = path.resolve(root);
  root = realpathSync(root);
  const requestedDirectory = path.resolve(directory);
  const requestedRelative = path.relative(requestedRoot, requestedDirectory);
  if (!requestedRelative.startsWith('..') && !path.isAbsolute(requestedRelative))
    assertSafeAncestors(requestedRoot, requestedDirectory);
  // Normalize macOS temporary-directory aliases before workspace comparisons.
  if (lstatSync(requestedDirectory).isSymbolicLink())
    throw new Error('Void migration paths must not traverse symlinks.');
  const realDirectory = realpathSync(requestedDirectory);
  const relativeDirectory = path.relative(root, realDirectory);
  if (relativeDirectory.startsWith('..') || path.isAbsolute(relativeDirectory))
    throw new Error('Void migration preparation must stay inside the application workspace.');
  directory = realDirectory;
  assertSafeAncestors(root, directory);
  const target = path.join(directory, 'db/migrations');
  const receiptFile = path.join(directory, '.void/anhedral-migrations.json');
  assertSafeAncestors(root, target);
  assertSafeAncestors(root, receiptFile);
  const databases = Array.isArray(config.d1_databases) ? config.d1_databases : [];
  const owners = databases.filter((entry) => typeof entry.migrations_dir === 'string');
  if (owners.length > 1)
    throw new Error('One Void target may own only one shared D1 migration set.');
  let receipt: Record<string, string> | null = null;
  if (existsSync(receiptFile)) {
    const parsed = JSON.parse(readFileSync(receiptFile, 'utf8'));
    if (
      parsed.schemaVersion !== 1 ||
      !parsed.files ||
      typeof parsed.files !== 'object' ||
      Array.isArray(parsed.files)
    )
      throw new Error('Invalid Void migration ownership receipt.');
    receipt = parsed.files;
  }
  const current = files(target);
  if (existsSync(target) && !receipt)
    throw new Error(
      'Refusing to overwrite an existing app db/migrations directory without Anhedral ownership evidence.',
    );
  if (receipt) {
    const expected = Object.keys(receipt).sort();
    if (
      JSON.stringify(current) !== JSON.stringify(expected) ||
      current.some((file) => digest(readFileSync(path.join(target, file))) !== receipt![file])
    )
      throw new Error(
        'Generated Void migrations were edited; review them before preparing deployment.',
      );
  }
  if (!owners.length) {
    if (receipt) {
      rmSync(target, { recursive: true, force: true });
      rmSync(receiptFile);
    }
    return;
  }
  const source = path.resolve(directory, owners[0].migrations_dir);
  const expectedSource = path.join(root, 'packages/db/drizzle');
  if (source !== expectedSource)
    throw new Error('Void migration owner must use packages/db/drizzle.');
  assertSafeAncestors(root, source);
  if (!existsSync(source)) throw new Error('Shared D1 migration directory does not exist.');
  const names = files(source).filter(
    (file) => /^[^/]+\.sql$/.test(file) || /^meta\/[^/]+\.json$/.test(file),
  );
  if (names.includes('seed.sql'))
    throw new Error('Keep seed.sql outside the deployable shared migration directory.');
  const contents = new Map(names.map((name) => [name, readFileSync(path.join(source, name))]));
  if (receipt) rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  const hashes: Record<string, string> = {};
  for (const [name, content] of contents) {
    mkdirSync(path.dirname(path.join(target, name)), { recursive: true });
    writeFileSync(path.join(target, name), content);
    hashes[name] = digest(content);
  }
  mkdirSync(path.dirname(receiptFile), { recursive: true });
  writeFileSync(receiptFile, JSON.stringify({ schemaVersion: 1, files: hashes }, null, 2) + '\n');
}
