import { randomUUID } from 'node:crypto';
import { lstatSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { withSourceWriteLock } from './transaction.js';
import { readBoundedFile, MAX_PROJECT_JSON_BYTES } from './bounded-file.js';

export const PROJECT_CONFIG_FILE = 'anhedral.json';
export const PROJECT_CONFIG_MAX_BYTES = MAX_PROJECT_JSON_BYTES;
export const PROJECT_CONFIG_SECTIONS = [
  'identity',
  'standard',
  'setup',
  'providers',
  'cloudflare',
  'vercel',
  'registry',
] as const;
export type ProjectSection = (typeof PROJECT_CONFIG_SECTIONS)[number];
export type ProjectConfig = { schemaVersion: 1 } & Partial<Record<ProjectSection, unknown>>;

/** Validate the envelope independently; each domain validates its own selected section. */
export function parseProjectConfig(value: unknown): ProjectConfig {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    (value as Record<string, unknown>).schemaVersion !== 1 ||
    Object.keys(value).some(
      (key) => key !== 'schemaVersion' && !PROJECT_CONFIG_SECTIONS.includes(key as ProjectSection),
    )
  )
    throw new Error('Invalid anhedral.json configuration.');
  return value as ProjectConfig;
}

export function projectConfigPath(root: string): string {
  return path.join(root, PROJECT_CONFIG_FILE);
}

export function readProjectConfig(root: string): ProjectConfig {
  const source = readBoundedFile(projectConfigPath(root), PROJECT_CONFIG_MAX_BYTES).toString(
    'utf8',
  );
  try {
    return parseProjectConfig(JSON.parse(source));
  } catch {
    throw new Error('Invalid anhedral.json configuration.');
  }
}

function assertSection(section: ProjectSection): void {
  if (!PROJECT_CONFIG_SECTIONS.includes(section)) throw new Error('Unknown anhedral.json section.');
}

export function hasProjectSection(root: string, section: ProjectSection): boolean {
  assertSection(section);
  if (!lstatSync(projectConfigPath(root), { throwIfNoEntry: false })) return false;
  return Object.hasOwn(readProjectConfig(root), section);
}

// Domain callers retain responsibility for validating their complete section contracts.
export function readProjectSection<T = any>(root: string, section: ProjectSection): T {
  assertSection(section);
  const value = readProjectConfig(root)[section];
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Missing or invalid anhedral.json ${section} section.`);
  return value as T;
}

/** Atomically replace one section while preserving other domains' configuration. */
function writeSection(root: string, section: ProjectSection, value: unknown): void {
  assertSection(section);
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Invalid anhedral.json ${section} section.`);
  const file = projectConfigPath(root);
  const previous = lstatSync(file, { throwIfNoEntry: false }) ? readProjectConfig(root) : {};
  const config = { ...previous, schemaVersion: 1, [section]: value } as ProjectConfig;
  const ordered = {
    schemaVersion: 1,
    ...Object.fromEntries(
      PROJECT_CONFIG_SECTIONS.filter((key) => Object.hasOwn(config, key)).map((key) => [
        key,
        config[key],
      ]),
    ),
  };
  const bytes = JSON.stringify(ordered, null, 2) + '\n';
  if (Buffer.byteLength(bytes) > PROJECT_CONFIG_MAX_BYTES)
    throw new Error('anhedral.json exceeds its size limit.');
  // Avoid changing source bytes or permissions when the requested section is unchanged.
  if (lstatSync(file, { throwIfNoEntry: false }) && readFileSync(file, 'utf8') === bytes) return;
  const temporary = `${file}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, bytes, { mode: 0o600, flag: 'wx' });
    renameSync(temporary, file);
  } finally {
    rmSync(temporary, { force: true });
  }
}

export function writeProjectSection(root: string, section: ProjectSection, value: unknown): void {
  withSourceWriteLock(root, () => writeSection(root, section, value));
}
