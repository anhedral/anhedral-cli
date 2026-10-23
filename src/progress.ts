import { closeSync, existsSync, fsyncSync, lstatSync, openSync, readFileSync, readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { STANDARD_PRODUCTS } from './standard-products.js';

export const PROGRESS_FILE = 'anhedral.progress.json';
export const PROGRESS_MILESTONES = ['declared', 'generated', 'provisioned', 'connected', 'tested', 'deployed'] as const;
export type ProgressIdentity = { gitRevision?: string; configDigest?: string; resourceId?: string; accountId?: string };
export type ProgressObservation = {
  capability: string; environment: string; milestone: typeof PROGRESS_MILESTONES[number];
  status: 'pending' | 'succeeded' | 'failed' | 'blocked'; summary: string; evidence: string[];
  observedAt: string; source: 'agent-reported' | 'provider-verified' | 'local-check'; identity?: ProgressIdentity;
};
export type ProgressDiscovery = {
  kind: 'tool' | 'local-environment' | 'account' | 'integration'; name: string;
  status: 'available' | 'unavailable' | 'unknown'; scope: string; observedAt: string; summary: string;
};
export type ProgressUpdate = {
  expectedRevision: number; appName?: string; selected?: string[]; hosting?: 'cloudflare' | 'vercel';
  nextAction?: string; links?: { preview?: string; live?: string; environment?: string };
  observations?: ProgressObservation[]; discoveries?: ProgressDiscovery[];
};
export type ProjectProgress = {
  version: 1; revision: number; updatedAt: string; appName: string; selected: string[];
  hosting: 'cloudflare' | 'vercel'; nextAction: string; links: { preview?: string; live?: string; environment?: string };
  observations: ProgressObservation[]; discoveries: ProgressDiscovery[];
};
const capabilities = new Set<string>([...STANDARD_PRODUCTS, 'domain', 'email-routing', 'email-sending', 'containers']);
const secretPattern = /(?:postgres(?:ql)?:\/\/|Bearer\s+\S+|-----BEGIN [\w ]*PRIVATE KEY-----|sk-(?:proj-|live_|test_)?[\w-]{12,}|(?:api[_ -]?key|secret|token|password|authorization)\s*[=:]\s*\S+|AKIA[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{20,}|eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]+)/i;
function object(value: unknown, allowed: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected progress object');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).some((key) => !allowed.includes(key))) throw new Error('Unknown progress field');
  return record;
}
function text(value: unknown, maximum = 1000, empty = false): string {
  if (typeof value !== 'string' || value.length > maximum || (!empty && !value.trim()) || secretPattern.test(value) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) throw new Error('Use bounded non-secret progress text');
  return value;
}
function member<T extends string>(value: unknown, choices: readonly T[]): T {
  if (typeof value !== 'string' || !choices.includes(value as T)) throw new Error('Invalid progress value');
  return value as T;
}
function date(value: unknown): string {
  const result = text(value, 40);
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?Z$/.test(result) || !Number.isFinite(Date.parse(result)) || Date.parse(result) > Date.now() + 300_000) throw new Error('Invalid progress observation time');
  return result;
}
function array<T>(value: unknown, maximum: number, parse: (item: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > maximum) throw new Error('Progress array limit exceeded');
  return value.map(parse);
}
function revision(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new Error('Invalid progress revision');
  return value as number;
}
function capability(value: unknown): string {
  const result = text(value, 40);
  if (!capabilities.has(result)) throw new Error('Unknown progress capability');
  return result;
}
function environment(value: unknown): string {
  const result = text(value, 40);
  if (!/^[a-zA-Z0-9_-]{1,40}$/.test(result) || ['__proto__', 'prototype', 'constructor'].includes(result)) throw new Error('Invalid progress environment');
  return result;
}
function links(value: unknown): ProjectProgress['links'] {
  const input = object(value, ['preview', 'live', 'environment']);
  const output: ProjectProgress['links'] = {};
  if (input.environment !== undefined) output.environment = environment(input.environment);
  for (const key of ['preview', 'live'] as const) if (input[key] !== undefined) {
    const raw = text(input[key], 2048);
    const url = new URL(raw);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash || (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('Use an HTTPS or local preview URL without credentials, query or fragment');
    output[key] = raw;
  }
  return output;
}
function observation(value: unknown): ProgressObservation {
  const input = object(value, ['capability', 'environment', 'milestone', 'status', 'summary', 'evidence', 'observedAt', 'source', 'identity']);
  const output: ProgressObservation = {
    capability: capability(input.capability), environment: environment(input.environment),
    milestone: member(input.milestone, PROGRESS_MILESTONES), status: member(input.status, ['pending', 'succeeded', 'failed', 'blocked']),
    summary: text(input.summary), evidence: array(input.evidence, 12, (item) => text(item, 500)), observedAt: date(input.observedAt),
    source: member(input.source, ['agent-reported', 'provider-verified', 'local-check']),
  };
  if (input.identity !== undefined) {
    const identity = object(input.identity, ['gitRevision', 'configDigest', 'resourceId', 'accountId']);
    output.identity = {};
    for (const key of ['gitRevision', 'configDigest', 'resourceId', 'accountId'] as const) if (identity[key] !== undefined) output.identity[key] = text(identity[key], 200);
  }
  return output;
}
function discovery(value: unknown): ProgressDiscovery {
  const input = object(value, ['kind', 'name', 'status', 'scope', 'observedAt', 'summary']);
  return { kind: member(input.kind, ['tool', 'local-environment', 'account', 'integration']), name: text(input.name, 120), status: member(input.status, ['available', 'unavailable', 'unknown']), scope: text(input.scope, 200), observedAt: date(input.observedAt), summary: text(input.summary) };
}
export function validateProgressUpdate(value: unknown): ProgressUpdate {
  const input = object(value, ['expectedRevision', 'appName', 'selected', 'hosting', 'nextAction', 'links', 'observations', 'discoveries']);
  const output: ProgressUpdate = { expectedRevision: revision(input.expectedRevision) };
  if (input.appName !== undefined) output.appName = text(input.appName, 120, true);
  if (input.nextAction !== undefined) output.nextAction = text(input.nextAction, 1000, true);
  if (input.hosting !== undefined) output.hosting = member(input.hosting, ['cloudflare', 'vercel'] as const);
  if (input.selected !== undefined) {
    output.selected = array(input.selected, capabilities.size, capability);
    if (new Set(output.selected).size !== output.selected.length) throw new Error('Duplicate progress capability');
  }
  if (input.links !== undefined) output.links = links(input.links);
  if (input.observations !== undefined) output.observations = array(input.observations, 500, observation);
  if (input.discoveries !== undefined) output.discoveries = array(input.discoveries, 100, discovery);
  unique(output.observations ?? [], observationKey);
  unique(output.discoveries ?? [], discoveryKey);
  return output;
}
function observationKey(item: ProgressObservation): string { return `${item.capability}/${item.environment}/${item.milestone}`; }
function discoveryKey(item: ProgressDiscovery): string { return JSON.stringify([item.kind, item.name, item.scope]); }
function unique<T>(items: T[], key: (item: T) => string): void {
  if (new Set(items.map(key)).size !== items.length) throw new Error('Duplicate progress observation identity');
}
function validateState(value: unknown): ProjectProgress {
  const input = object(value, ['version', 'revision', 'updatedAt', 'appName', 'selected', 'hosting', 'nextAction', 'links', 'observations', 'discoveries']);
  if (input.version !== 1) throw new Error('Unsupported progress version');
  const { expectedRevision, ...fields } = validateProgressUpdate({ expectedRevision: input.revision, ...Object.fromEntries(['appName', 'selected', 'hosting', 'nextAction', 'links', 'observations', 'discoveries'].map((key) => [key, input[key]])) });
  if (Object.values(fields).length !== 7) throw new Error('Incomplete progress state');
  const output = { version: 1 as const, revision: expectedRevision, updatedAt: date(input.updatedAt), ...fields } as ProjectProgress;
  if (output.observations.some((item) => !output.selected.includes(item.capability))) throw new Error('Observation capability is not selected');
  return output;
}
function safeRoot(root: string): string {
  const resolved = realpathSync(path.resolve(root));
  if (!lstatSync(resolved).isDirectory()) throw new Error('Progress root must be a directory');
  return resolved;
}
function safeFile(root: string, name: string): string {
  const file = path.join(root, name);
  if (existsSync(file) && (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink())) throw new Error('Unsafe progress file');
  // existsSync returns false for dangling symlinks.
  try { if (lstatSync(file).isSymbolicLink()) throw new Error('Unsafe progress file'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  return file;
}
export function readProjectProgress(root: string): ProjectProgress | null {
  const file = safeFile(safeRoot(root), PROGRESS_FILE);
  if (!existsSync(file)) return null;
  if (lstatSync(file).size > 1_000_000) throw new Error('Progress file exceeds size limit');
  return validateState(JSON.parse(readFileSync(file, 'utf8')));
}
/** Non-secret local identity: config hashes are evidence of drift, never provider authorization. */
export function inspectProgressIdentity(root: string): ProgressIdentity {
  const resolved = safeRoot(root);
  const files = ['package.json', 'anhedral.setup.json', 'anhedral.standard.json', 'wrangler.json', 'wrangler.jsonc', 'wrangler.toml'];
  const apps = path.join(resolved, 'apps');
  if (existsSync(apps)) {
    if (lstatSync(apps).isSymbolicLink() || !lstatSync(apps).isDirectory()) throw new Error('Unsafe progress configuration directory');
    const directories = readdirSync(apps, { withFileTypes: true });
    if (directories.length > 100) throw new Error('Progress configuration count exceeds limit');
    for (const entry of directories) {
      if (entry.isSymbolicLink()) throw new Error('Unsafe progress application directory');
      if (entry.isDirectory()) for (const filename of ['wrangler.json', 'wrangler.jsonc', 'wrangler.toml']) files.push(`apps/${entry.name}/${filename}`);
    }
  }
  const hash = createHash('sha256');
  let bytes = 0;
  for (const filename of files.sort()) {
    const file = safeFile(resolved, filename);
    hash.update(`${filename}\0`);
    if (!existsSync(file)) { hash.update('missing\0'); continue; }
    const size = lstatSync(file).size;
    bytes += size;
    if (size > 1_000_000 || bytes > 5_000_000) throw new Error('Progress configuration exceeds size limit');
    hash.update(readFileSync(file));
    hash.update('\0');
  }
  const identity: ProgressIdentity = { configDigest: hash.digest('hex') };
  try {
    const options = { cwd: resolved, encoding: 'utf8' as const, timeout: 2000, maxBuffer: 4096, stdio: ['ignore', 'pipe', 'ignore'] as ['ignore', 'pipe', 'ignore'] };
    const gitRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], options).trim();
    if (realpathSync(gitRoot) === resolved) {
      const head = execFileSync('git', ['rev-parse', '--verify', 'HEAD'], options).trim();
      if (/^[a-f0-9]{40,64}$/.test(head)) identity.gitRevision = head;
    }
  } catch { /* New projects and environments without Git still have a config identity. */ }
  return identity;
}
/** Compare observed facts with current source/config/account identity before reusing them. */
export function progressFreshness(observed: { observedAt: string; identity?: ProgressIdentity }, current: { identity?: ProgressIdentity; now?: number; maxAgeMs?: number } = {}): 'current' | 'stale' | 'drifted' {
  if (current.identity && Object.entries(current.identity).some(([key, value]) => observed.identity?.[key as keyof ProgressIdentity] !== value)) return 'drifted';
  return (current.now ?? Date.now()) - Date.parse(observed.observedAt) > (current.maxAgeMs ?? 86_400_000) ? 'stale' : 'current';
}
/** CAS plus exclusive local lock prevents concurrent writers from silently losing observations. */
export async function updateProjectProgress(root: string, value: ProgressUpdate): Promise<ProjectProgress> {
  const update = validateProgressUpdate(value);
  const resolved = safeRoot(root);
  const lock = safeFile(resolved, '.anhedral-progress.lock');
  let descriptor: number;
  try { descriptor = openSync(lock, 'wx', 0o600); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new Error('Progress update in progress; retry after inspecting the lock if its owner stopped');
    throw error;
  }
  const temporary = path.join(resolved, `.anhedral-progress-${randomUUID()}.tmp`);
  try {
    writeFileSync(descriptor, JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    const before = readProjectProgress(resolved);
    if ((before?.revision ?? 0) !== update.expectedRevision) throw new Error('Progress revision conflict; reload state before reporting');
    const state: ProjectProgress = before ?? { version: 1, revision: 0, updatedAt: new Date().toISOString(), appName: '', selected: [], hosting: 'cloudflare', nextAction: '', links: {}, observations: [], discoveries: [] };
    const { expectedRevision: _, observations, discoveries, ...fields } = update;
    Object.assign(state, fields);
    if (update.selected) state.observations = state.observations.filter((item) => update.selected!.includes(item.capability));
    const merge = <T extends { observedAt: string }>(previous: T[], incoming: T[], key: (item: T) => string) => {
      const entries = new Map(previous.map((item) => [key(item), item]));
      for (const item of incoming) {
        const prior = entries.get(key(item));
        if (prior && Date.parse(prior.observedAt) > Date.parse(item.observedAt)) throw new Error('Older observation cannot replace newer evidence');
        entries.set(key(item), item);
      }
      return [...entries.values()];
    };
    state.observations = merge(state.observations, observations ?? [], observationKey);
    state.discoveries = merge(state.discoveries, discoveries ?? [], discoveryKey);
    state.revision += 1;
    state.updatedAt = new Date().toISOString();
    validateState(state);
    const serialized = `${JSON.stringify(state, null, 2)}\n`;
    if (Buffer.byteLength(serialized) > 1_000_000) throw new Error('Progress file exceeds size limit');
    const temporaryDescriptor = openSync(temporary, 'wx', 0o600);
    try { writeFileSync(temporaryDescriptor, serialized); fsyncSync(temporaryDescriptor); } finally { closeSync(temporaryDescriptor); }
    renameSync(temporary, safeFile(resolved, PROGRESS_FILE));
    return state;
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
    closeSync(descriptor);
    unlinkSync(lock);
  }
}
