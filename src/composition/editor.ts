import { readBoundedFile, MAX_PROJECT_JSON_BYTES } from '../bounded-file.js';
import semver from 'semver';
import { templateDependencyRange } from '../dependencies.js';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { parse, visit, modify, applyEdits, type ParseError } from 'jsonc-parser';

export const fingerprint = (source: string | Buffer) =>
  createHash('sha256').update(source).digest('hex');
/** A bounded, read-only overlay until every capability has passed preflight. */
export class CapabilityEditor {
  readonly writes = new Map<string, string>();
  readonly before = new Map<string, string | null>();
  constructor(
    readonly root: string,
    readonly managed: Record<string, string>,
    private readonly operation: 'add' | 'update' = 'add',
  ) {}
  file(relative: string) {
    if (
      !relative ||
      path.isAbsolute(relative) ||
      relative.includes('\\') ||
      relative.split('/').some((p) => !p || p === '.' || p === '..')
    )
      throw Error(`Unsafe addition path: ${relative}`);
    let current = this.root;
    for (const part of relative.split('/')) {
      current = path.join(current, part);
      try {
        if (lstatSync(current).isSymbolicLink()) throw Error(`Refusing a symlink in ${relative}.`);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
    return current;
  }
  read(relative: string): string | null {
    const file = this.file(relative);
    if (this.writes.has(relative)) return this.writes.get(relative)!;
    if (!this.before.has(relative)) {
      const value = existsSync(file)
        ? readBoundedFile(
            file,
            relative === 'pnpm-lock.yaml' || path.posix.basename(relative) === 'Cargo.lock'
              ? 16 * 1024 * 1024
              : MAX_PROJECT_JSON_BYTES,
          )
        : null;
      this.before.set(relative, value?.toString('utf8') ?? null);
    }
    return this.before.get(relative)!;
  }
  json(relative: string): Record<string, any> {
    const source = this.read(relative);
    if (source === null) throw Error(`Missing ${relative}.`);
    const errors: ParseError[] = [];
    const value = parse(source, errors, { allowTrailingComma: true });
    if (errors.length || !value || typeof value !== 'object' || Array.isArray(value))
      throw Error(`Invalid JSON/JSONC in ${relative}.`);
    // JSON modification targets the first property while runtime parsers use the last.
    // Compare decoded keys in each object so escaped aliases cannot bypass this guard.
    const objects: Set<string>[] = [];
    let duplicate = false;
    visit(
      source,
      {
        onObjectBegin() {
          objects.push(new Set());
        },
        onObjectProperty(property) {
          const keys = objects.at(-1)!;
          if (keys.has(property)) duplicate = true;
          keys.add(property);
        },
        onObjectEnd() {
          objects.pop();
        },
      },
      { allowTrailingComma: true },
    );
    if (duplicate)
      throw Error(
        `Duplicate JSON object keys in ${relative}; preserve and reconcile them before editing source.`,
      );
    return value;
  }
  create(relative: string, source: string) {
    if (this.read(relative) !== null)
      throw Error(`Addition conflicts with existing source: ${relative}. No files were changed.`);
    this.writes.set(relative, source);
  }
  owned(relative: string, source: string) {
    const current = this.read(relative);
    const desiredDigest = fingerprint(source);
    // The recorded digest is the common baseline for release and local edits.
    if (this.operation === 'update' && current !== null) {
      if (current === source) {
        this.managed[relative] = desiredDigest;
        return;
      }
      if (this.managed[relative] === desiredDigest) return;
    }
    if (
      current !== null &&
      !this.writes.has(relative) &&
      this.managed[relative] !== fingerprint(current)
    )
      throw Error(
        `Preserve edited generated source: ${relative}. Reconcile it before applying stack changes. No files were changed.`,
      );
    this.writes.set(relative, source);
    this.managed[relative] = desiredDigest;
  }
  set(relative: string, keys: (string | number)[], value: unknown) {
    const source = this.read(relative);
    if (source === null) throw Error(`Missing configuration: ${relative}`);
    this.json(relative);
    this.writes.set(
      relative,
      applyEdits(
        source,
        modify(source, keys, value, { formattingOptions: { insertSpaces: true, tabSize: 2 } }),
      ),
    );
  }
  merge(relative: string, section: string, values: Record<string, unknown>) {
    const current = this.json(relative)[section] ?? {};
    if (!current || typeof current !== 'object' || Array.isArray(current))
      throw Error(`Expected ${section} object in ${relative}.`);
    for (const [key, value] of Object.entries(values)) {
      // A later recipe can request a dependency the consumer already pinned.
      if (
        relative.endsWith('/package.json') &&
        ['dependencies', 'devDependencies'].includes(section) &&
        typeof value === 'string' &&
        semver.valid(value) &&
        typeof current[key] === 'string' &&
        semver.valid(current[key]) &&
        semver.satisfies(current[key], templateDependencyRange(key, value))
      )
        continue;
      if (Object.hasOwn(current, key) && JSON.stringify(current[key]) !== JSON.stringify(value))
        throw Error(
          `Configuration conflict: ${relative} ${section}.${key}. Preserve and reconcile the existing value.`,
        );
      this.set(relative, [section, key], value);
    }
  }
  verify() {
    for (const [relative, before] of this.before) {
      const file = this.file(relative);
      const current = existsSync(file)
        ? readBoundedFile(
            file,
            relative === 'pnpm-lock.yaml' || path.posix.basename(relative) === 'Cargo.lock'
              ? 16 * 1024 * 1024
              : MAX_PROJECT_JSON_BYTES,
          ).toString('utf8')
        : null;
      if (before !== current)
        throw Error(
          `Source changed during ${this.operation}: ${relative}. Retry after reviewing it.`,
        );
    }
  }
}
