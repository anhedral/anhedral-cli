import { cliArtifactSchema, type CliArtifact } from './contracts/deployment.js';
import { GENERATOR_VERSION } from './version.js';

const MAX_JSON_BYTES = 256 * 1024;
const MAX_TIMEOUT_MS = 15000;
const sourceRevision = /^[a-f0-9]{40}$/;
const releaseVersion =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const verified = new WeakSet<object>();
declare const publishedArtifact: unique symbol;
export type PublishedCliArtifact = Readonly<CliArtifact> & { readonly [publishedArtifact]: true };
export type ReleaseArtifactOptions = {
  fetch?: typeof globalThis.fetch;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export class ArtifactUnavailableError extends Error {
  readonly code = 'ARTIFACT_UNAVAILABLE';
  constructor() {
    super(
      'The running CLI release artifact could not be verified from official GitHub and npm metadata. Retry after publication or use --offline for a source-only update; deployment will remain unavailable.',
    );
    this.name = 'ArtifactUnavailableError';
  }
}

export function isPublishedCliArtifact(value: unknown): value is PublishedCliArtifact {
  return typeof value === 'object' && value !== null && verified.has(value);
}

function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new ArtifactUnavailableError();
  return value as Record<string, unknown>;
}

function abortable<T>(signal: AbortSignal, operation: () => Promise<T>): Promise<T> {
  signal.throwIfAborted();
  return new Promise<T>((resolve, reject) => {
    const abort = () => reject(new ArtifactUnavailableError());
    signal.addEventListener('abort', abort, { once: true });
    Promise.resolve()
      .then(operation)
      .then(
        (value) => {
          signal.removeEventListener('abort', abort);
          resolve(value);
        },
        (error: unknown) => {
          signal.removeEventListener('abort', abort);
          reject(error);
        },
      );
  });
}

async function readJson(response: Response, signal: AbortSignal): Promise<Record<string, unknown>> {
  if (!response.ok || !response.body) {
    void response.body?.cancel().catch(() => undefined);
    throw new ArtifactUnavailableError();
  }
  const length = response.headers.get('content-length');
  if (length !== null && Number(length) > MAX_JSON_BYTES) {
    void response.body.cancel().catch(() => undefined);
    throw new ArtifactUnavailableError();
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      signal.throwIfAborted();
      const result = await abortable(signal, () => reader.read());
      if (result.done) break;
      size += result.value.byteLength;
      if (size > MAX_JSON_BYTES) throw new ArtifactUnavailableError();
      chunks.push(result.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return object(JSON.parse(new TextDecoder('utf8', { fatal: true }).decode(bytes)));
  } finally {
    void reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

/** Only fixed official public release endpoints may supply provenance. No project context is read. */
export async function resolvePublishedCliArtifact(
  options: ReleaseArtifactOptions = {},
): Promise<PublishedCliArtifact> {
  const timeout = options.timeoutMs ?? MAX_TIMEOUT_MS;
  if (
    !Number.isInteger(timeout) ||
    timeout < 1 ||
    timeout > MAX_TIMEOUT_MS ||
    !releaseVersion.test(GENERATOR_VERSION)
  )
    throw new ArtifactUnavailableError();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const signal = AbortSignal.any([controller.signal, ...(options.signal ? [options.signal] : [])]);
  const fetcher = options.fetch ?? globalThis.fetch;
  async function request(url: URL, redirects = false) {
    for (let count = 0; ; count++) {
      signal.throwIfAborted();
      const response = await abortable(signal, () =>
        fetcher(url.href, {
          method: 'GET',
          redirect: 'manual',
          credentials: 'omit',
          cache: 'no-store',
          referrerPolicy: 'no-referrer',
          signal,
          headers: { accept: 'application/json', 'user-agent': 'anhedral-cli' },
        }),
      );
      if (response.redirected || (response.url && new URL(response.url).href !== url.href))
        throw new ArtifactUnavailableError();
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        void response.body?.cancel().catch(() => undefined);
        if (!redirects || count >= 2 || !location) throw new ArtifactUnavailableError();
        const next = new URL(location, url);
        if (
          next.protocol !== 'https:' ||
          next.hostname !== 'release-assets.githubusercontent.com' ||
          next.port ||
          next.username ||
          next.password ||
          next.hash
        )
          throw new ArtifactUnavailableError();
        url = next;
        continue;
      }
      return readJson(response, signal);
    }
  }
  try {
    const version = GENERATOR_VERSION;
    const metadata = await request(
      new URL(
        `https://github.com/anhedral/anhedral-cli/releases/download/v${version}/metadata.json`,
      ),
      true,
    );
    if (
      metadata.schemaVersion !== 1 ||
      metadata.name !== 'anhedral' ||
      metadata.version !== version ||
      metadata.filename !== `anhedral-${version}.tgz` ||
      typeof metadata.sourceRevision !== 'string' ||
      !sourceRevision.test(metadata.sourceRevision)
    )
      throw new ArtifactUnavailableError();
    const artifact = cliArtifactSchema.parse({
      version,
      sourceRevision: metadata.sourceRevision,
      packageIntegrity: metadata.integrity,
    });
    const registry = await request(new URL(`https://registry.npmjs.org/anhedral/${version}`));
    const dist = object(registry.dist);
    if (
      registry.name !== 'anhedral' ||
      registry.version !== version ||
      dist.integrity !== artifact.packageIntegrity ||
      dist.tarball !== `https://registry.npmjs.org/anhedral/-/anhedral-${version}.tgz`
    )
      throw new ArtifactUnavailableError();
    if (registry.gitHead !== undefined && registry.gitHead !== artifact.sourceRevision)
      throw new ArtifactUnavailableError();
    const ref = await request(
      new URL(`https://api.github.com/repos/anhedral/anhedral-cli/git/ref/tags/v${version}`),
    );
    if (ref.ref !== `refs/tags/v${version}`) throw new ArtifactUnavailableError();
    let target = object(ref.object);
    if (target.type === 'tag') {
      if (typeof target.sha !== 'string' || !sourceRevision.test(target.sha))
        throw new ArtifactUnavailableError();
      const tag = await request(
        new URL(`https://api.github.com/repos/anhedral/anhedral-cli/git/tags/${target.sha}`),
      );
      if (tag.tag !== `v${version}`) throw new ArtifactUnavailableError();
      target = object(tag.object);
    }
    if (target.type !== 'commit' || target.sha !== artifact.sourceRevision)
      throw new ArtifactUnavailableError();
    const result = Object.freeze(artifact) as PublishedCliArtifact;
    verified.add(result);
    return result;
  } catch {
    throw new ArtifactUnavailableError();
  } finally {
    clearTimeout(timer);
  }
}
