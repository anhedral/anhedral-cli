import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { dependencyOrder } from '../dependency-order.js';
import { assertSafeTarget } from './receipt.js';

export interface SourceItem {
  name: string;
  version: string;
  registryDependencies: string[];
  files: { target: string; content: string }[];
}
export interface SourceRegistry {
  schemaVersion: 1;
  name: string;
  items: SourceItem[];
}
export interface RemoteRegistry {
  source: string;
  integrity: string;
  registry: SourceRegistry;
}
const identifier = /^[a-z][a-z0-9-]{0,62}$/;
const limit = 2 * 1024 * 1024;

/** Declarative source only: no executable recipe callbacks, hooks or destination templates. */
export function validateSourceRegistry(value: unknown): SourceRegistry {
  if (!value || typeof value !== 'object') throw new Error('Invalid source registry.');
  const registry = value as SourceRegistry;
  if (
    registry.schemaVersion !== 1 ||
    typeof registry.name !== 'string' ||
    !identifier.test(registry.name) ||
    !Array.isArray(registry.items) ||
    !registry.items.length ||
    registry.items.length > 100
  )
    throw new Error('Unsupported source registry schema.');
  const names = new Set<string>();
  const files = new Set<string>();
  for (const item of registry.items) {
    if (
      !item ||
      typeof item.name !== 'string' ||
      !identifier.test(item.name) ||
      names.has(item.name) ||
      typeof item.version !== 'string' ||
      !/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/.test(item.version) ||
      !Array.isArray(item.registryDependencies) ||
      !item.registryDependencies.every((id) => typeof id === 'string' && identifier.test(id)) ||
      !Array.isArray(item.files) ||
      !item.files.length
    )
      throw new Error('Invalid or duplicate source registry item.');
    names.add(item.name);
    for (const file of item.files) {
      if (!file || typeof file.target !== 'string' || typeof file.content !== 'string')
        throw new Error('Invalid registry file.');
      assertSafeTarget('/registry-validation', file.target);
      if (
        !/^(?:apps|packages)\/[a-z][a-z0-9-]*\//.test(file.target) ||
        file.target
          .split('/')
          .some(
            (part) =>
              part.startsWith('.') ||
              ['node_modules', 'dist', 'release', 'anhedral.registry.json'].includes(part),
          ) ||
        files.has(file.target)
      )
        throw new Error(`Unsafe or duplicate source target: ${file.target}.`);
      files.add(file.target);
      if (path.basename(file.target) === 'package.json') {
        const manifest = JSON.parse(file.content);
        if (
          !manifest ||
          typeof manifest !== 'object' ||
          Array.isArray(manifest) ||
          manifest.private !== true ||
          typeof manifest.name !== 'string' ||
          !/^@workspace\/[a-z][a-z0-9-]*$/.test(manifest.name)
        )
          throw new Error('Remote workspace manifests must be private @workspace packages.');
        if (
          manifest.scripts &&
          Object.keys(manifest.scripts).some((key) =>
            /^(?:preinstall|install|postinstall|preprepare|prepare|postprepare|prepublish|prepublishOnly|pnpm:devPreinstall)$/.test(
              key,
            ),
          )
        )
          throw new Error('Remote installation hooks are unsupported.');
        for (const field of [
          'dependencies',
          'devDependencies',
          'optionalDependencies',
          'peerDependencies',
        ]) {
          if (
            manifest[field] &&
            (typeof manifest[field] !== 'object' ||
              Array.isArray(manifest[field]) ||
              Object.values(manifest[field]).some(
                (version) =>
                  typeof version !== 'string' ||
                  !/^(?:workspace:[*^~]|[~^]?\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?)$/.test(version),
              ))
          )
            throw new Error('Remote dependencies require versioned npm or workspace references.');
        }
      }
    }
  }
  dependencyOrder(
    new Map(registry.items.map((item) => [item.name, item.registryDependencies])),
    'Remote registry',
  );
  return structuredClone(registry);
}

export async function loadSourceRegistry(
  source: string,
  fetcher: typeof fetch = fetch,
): Promise<RemoteRegistry> {
  let bytes: Buffer;
  if (/^https?:/.test(source)) {
    const url = new URL(source);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.hash ||
      url.search ||
      !/^[a-z0-9.-]+$/i.test(url.hostname) ||
      url.hostname === 'localhost' ||
      !url.hostname.includes('.') ||
      /^\d+(?:\.\d+){3}$/.test(url.hostname)
    )
      throw new Error(
        'Remote registries require a public HTTPS URL without credentials or query parameters.',
      );
    const response = await fetcher(url, { redirect: 'error', signal: AbortSignal.timeout(15_000) });
    if (!response.ok || !response.body) throw new Error('Cannot retrieve source registry.');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        size += result.value.byteLength;
        if (size > limit) throw new Error('Source registry exceeds 2 MiB.');
        chunks.push(result.value);
      }
    } finally {
      await reader.cancel();
    }
    bytes = Buffer.concat(chunks);
    source = url.href;
  } else {
    source = path.resolve(source);
    if (statSync(source).size > limit) throw new Error('Source registry exceeds 2 MiB.');
    bytes = readFileSync(source);
  }
  if (bytes.length > limit) throw new Error('Source registry exceeds 2 MiB.');
  return {
    source,
    integrity: `sha256-${createHash('sha256').update(bytes).digest('base64')}`,
    registry: validateSourceRegistry(JSON.parse(bytes.toString('utf8'))),
  };
}

export function resolveSourceItems(
  registry: SourceRegistry,
  selected: readonly string[],
): SourceItem[] {
  const catalog = new Map(registry.items.map((item) => [item.name, item]));
  const graph = new Map<string, string[]>();
  const collect = (name: string): void => {
    if (graph.has(name)) return;
    const item = catalog.get(name);
    if (!item) throw new Error(`Unknown remote registry item: ${name}.`);
    graph.set(name, item.registryDependencies);
    item.registryDependencies.forEach(collect);
  };
  selected.forEach(collect);
  return dependencyOrder(graph, 'Remote registry').map((name) => catalog.get(name)!);
}

/** Compile repository-relative source paths into a distributable JSON payload. */
export function buildSourceRegistry(manifestFile: string): SourceRegistry {
  const root = path.dirname(path.resolve(manifestFile));
  if (statSync(manifestFile).size > limit) throw new Error('Source registry exceeds 2 MiB.');
  const registry = JSON.parse(readFileSync(manifestFile, 'utf8'));
  if (!Array.isArray(registry.items)) throw new Error('Invalid source registry manifest.');
  for (const item of registry.items) {
    if (!Array.isArray(item.files)) throw new Error('Invalid registry file list.');
    for (const file of item.files) {
      if (file.path === undefined) continue;
      if (typeof file.path !== 'string' || file.content !== undefined)
        throw new Error('Declare one source path or embedded content.');
      assertSafeTarget(root, file.path);
      if (
        !/^(?:apps|packages)\/[a-z][a-z0-9-]*\//.test(file.path) ||
        file.path.split('/').some((part: string) => part.startsWith('.') || part === 'node_modules')
      )
        throw new Error('Registry source paths must stay in application or package source.');
      const source = path.join(root, file.path);
      if (statSync(source).size > limit) throw new Error('Source registry exceeds 2 MiB.');
      file.content = readFileSync(source, 'utf8');
      delete file.path;
    }
  }
  if (Buffer.byteLength(JSON.stringify(registry)) > limit)
    throw new Error('Source registry exceeds 2 MiB.');
  return validateSourceRegistry(registry);
}
