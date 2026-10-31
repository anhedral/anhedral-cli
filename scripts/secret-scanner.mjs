import {
  CREDENTIAL_PATTERNS,
  isCredentialPlaceholder,
} from '../assets/security/credential-patterns.mjs';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';

// Keep this list intentionally high-confidence. Examples and tests construct tokens
// from fragments so the repository itself never has to allowlist a secret-shaped value.
const SECRET_PATTERNS = Object.freeze([
  {
    id: 'local-home-path',
    pattern:
      /(?:\/Users\/|\/home\/)[A-Za-z0-9._-]+(?:\/[^\s"'<>]*)?|[A-Za-z]:\\Users\\[A-Za-z0-9._-]+(?:\\[^\s"'<>]*)?/g,
  },
  {
    id: 'email-address',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  },
  ...CREDENTIAL_PATTERNS,
]);

const TEXT_EXTENSIONS = new Set([
  '',
  '.cjs',
  '.css',
  '.env',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.patch',
  '.mts',
  '.sh',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
  '.jsonc',
  '.toml',
  '.svg',
  '.xml',
  '.ini',
]);
const MAX_TEXT_BYTES = 5 * 1024 * 1024;

function looksLikeText(name, contents) {
  if (contents.length > MAX_TEXT_BYTES || contents.includes(0)) return false;
  const basename = path.basename(name);
  return (
    TEXT_EXTENSIONS.has(path.extname(basename).toLowerCase()) ||
    basename.startsWith('.env') ||
    basename === 'LICENSE'
  );
}

function isAllowedMatch(id, relativePath, match, text) {
  // Empty environment examples can put two long variable names next to each
  // other. The generic assignment detector crosses newlines; neither empty
  // assignment contains a value. Never exempt a populated second assignment.
  if (
    id === 'credential-assignment' &&
    path.basename(relativePath).endsWith('.example') &&
    /^[A-Z][A-Z0-9_]*[ \t]*=[ \t]*\r?\n[A-Z][A-Z0-9_]*=$/.test(match[0])
  )
    return true;
  if (id === 'email-address' && /^[a-z0-9._-]+@\d+\.\d+\.\d+\.patch$/i.test(match[0])) return true;
  if (
    id === 'email-address' &&
    /@(?:users\.noreply\.github\.com|(?:[A-Z0-9-]+\.)*example\.(?:com|net|org))$/i.test(match[0])
  )
    return true;
  // Explicitly published project contact; not a private address or credential.
  if (id === 'email-address' && /^(?:support|business)@anhedral\.com$/i.test(match[0])) return true;
  if (isCredentialPlaceholder(id, match[0])) return true;
  const assignedValue = match[0].match(/[:=]\s*["']?([^"'\s]+)["']?$/)?.[1];
  // Saved demos declare local-only placeholders in environment examples.
  // The same assignment in a runtime .env is still reported.
  if (
    id === 'credential-assignment' &&
    relativePath.endsWith('.env.example') &&
    /^local-demo-[a-z0-9-]+$/.test(assignedValue ?? '')
  )
    return true;
  const sourceLine = text.slice(0, match.index).split('\n').at(-1);
  if (
    id === 'email-address' &&
    ['THIRD_PARTY_NOTICES.txt', 'LICENSES.txt'].includes(path.basename(relativePath)) &&
    /^\s*Copyright\s+\(c\)\s+/i.test(sourceLine)
  )
    return true;
  // Package deprecation notices carry public maintainer contact addresses.
  if (
    id === 'email-address' &&
    path.basename(relativePath) === 'pnpm-lock.yaml' &&
    /^\s*deprecated:/.test(sourceLine)
  )
    return true;
  return false;
}

export function scanText(relativePath, contents) {
  if (!looksLikeText(relativePath, contents)) return [];
  const text = contents.toString('utf8');
  const findings = [];

  for (const { id, pattern } of SECRET_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      if (isAllowedMatch(id, relativePath, match, text)) continue;
      const line = text.slice(0, match.index).split('\n').length;
      findings.push({ path: relativePath, line, pattern: id });
    }
  }

  return findings;
}

function trackedFiles(root) {
  const output = execFileSync('git', ['ls-files', '-z'], { cwd: root });
  return output.toString('utf8').split('\0').filter(Boolean);
}

function workingTreeFiles(root) {
  const output = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    { cwd: root },
  );
  return output.toString('utf8').split('\0').filter(Boolean);
}

function collectFiles(root, directory, prefix = '') {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(root, absolute, relative));
    else if (entry.isFile()) files.push({ path: relative, contents: readFileSync(absolute) });
  }
  return files;
}

export function scanTrackedTree(root) {
  return trackedFiles(root).flatMap((relative) => {
    const absolute = path.join(root, relative);
    if (!existsSync(absolute) || !statSync(absolute).isFile()) return [];
    return scanText(relative, readFileSync(absolute));
  });
}

export function scanWorkingTree(root) {
  return workingTreeFiles(root).flatMap((relative) => {
    const absolute = path.join(root, relative);
    if (!existsSync(absolute) || !statSync(absolute).isFile()) return [];
    return scanText(relative, readFileSync(absolute));
  });
}

export function scanDirectory(root, relativeDirectory) {
  const absolute = path.join(root, relativeDirectory);
  return collectFiles(root, absolute, relativeDirectory).flatMap((file) =>
    scanText(file.path, file.contents),
  );
}

function readTarString(buffer, offset, length) {
  const end = buffer.indexOf(0, offset);
  return buffer
    .subarray(offset, end >= offset && end < offset + length ? end : offset + length)
    .toString('utf8');
}

function parseTarSize(buffer, offset, length) {
  const value = readTarString(buffer, offset, length).trim();
  if (!/^[0-7]*$/.test(value))
    throw new Error(`Unsupported tar size field: ${JSON.stringify(value)}`);
  return value === '' ? 0 : Number.parseInt(value, 8);
}

function tarballEntries(tarballPath) {
  const archive = gunzipSync(readFileSync(tarballPath));
  const entries = [];
  let offset = 0;

  while (offset + 512 <= archive.length) {
    const header = archive.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = readTarString(header, 0, 100);
    const prefix = readTarString(header, 345, 155);
    const entryPath = prefix ? `${prefix}/${name}` : name;
    const size = parseTarSize(header, 124, 12);
    const type = String.fromCharCode(header[156] || 48);
    const dataStart = offset + 512;
    const dataEnd = dataStart + size;
    if (dataEnd > archive.length) throw new Error(`Truncated tar entry: ${entryPath}`);
    if (type === '0' || type === '\0') {
      entries.push({ path: entryPath, contents: archive.subarray(dataStart, dataEnd) });
    }
    offset = dataStart + Math.ceil(size / 512) * 512;
  }

  return entries;
}

export function scanTarball(tarballPath) {
  return tarballEntries(tarballPath).flatMap((entry) => scanText(entry.path, entry.contents));
}

export function formatFindings(findings) {
  return findings
    .map((finding) => `${finding.path}:${finding.line}: resembles ${finding.pattern}`)
    .join('\n');
}
