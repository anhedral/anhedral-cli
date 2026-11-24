import { createHash } from 'node:crypto';

const PACKAGE_NAME_PATTERN = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const MAX_PACKAGE_NAME_LENGTH = 214;
const RESERVED_PACKAGE_NAMES = new Set(['node_modules', 'favicon.ico']);

function assertPackageName(value: string): string {
  const leafName = value.slice(value.lastIndexOf('/') + 1);
  if (
    value.length > MAX_PACKAGE_NAME_LENGTH ||
    !PACKAGE_NAME_PATTERN.test(value) ||
    RESERVED_PACKAGE_NAMES.has(leafName)
  ) {
    throw new Error(`Invalid package name: ${value}`);
  }
  return value;
}

function trimPackageSeparators(value: string): string {
  let start = 0;
  let end = value.length;
  while (start < end && '._-'.includes(value[start]!)) start++;
  while (end > start && '._-'.includes(value[end - 1]!)) end--;
  return value.slice(start, end);
}

function compactPackageSegment(value: string, maximumLength: number): string {
  if (value.length <= maximumLength) return value;
  const digest = createHash('sha256').update(value, 'utf8').digest('hex').slice(0, 8);
  const prefix = trimPackageSeparators(value.slice(0, maximumLength - digest.length - 1)) || 'app';
  return `${prefix}-${digest}`;
}

/** Derive a valid, deterministic unscoped npm package name from arbitrary text. */
export function packageNameFromText(value: string): string {
  let normalized = value
    .normalize('NFKD')
    .replace(/\p{Mark}+/gu, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-');
  normalized = trimPackageSeparators(normalized);
  if (!normalized) normalized = 'anhedral-app';
  if (RESERVED_PACKAGE_NAMES.has(normalized)) normalized = `anhedral-${normalized}`;
  return assertPackageName(compactPackageSegment(normalized, MAX_PACKAGE_NAME_LENGTH));
}

function identifierSegment(value: string): string {
  const segment = value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');
  return trimPackageSeparators(segment) || 'app';
}

/** Keep provider resource names within the shared Workers/R2/Queues naming limits. */
export function resourceName(projectName: string, suffix: string): string {
  const segment = identifierSegment(projectName);
  const qualifier = identifierSegment(suffix);
  if (qualifier.length > 40) throw new Error('Resource suffix is too long.');
  const digest = createHash('sha256').update(projectName).digest('hex').slice(0, 8);
  const base = segment === projectName ? segment : `${segment}-${digest}`;
  return `${compactPackageSegment(base, 62 - qualifier.length)}-${qualifier}`;
}
