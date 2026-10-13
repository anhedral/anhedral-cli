import type { ApplicationProject, DeliveryRunner } from './project-state.js';

export interface CloudflareResponse {
  result: unknown;
  result_info?: { page?: number; total_pages?: number; count?: number; per_page?: number };
}
export type CloudflareRequest = (
  method: 'GET' | 'POST',
  endpoint: string,
  body?: unknown,
) => Promise<CloudflareResponse>;

const ORIGIN = 'https://api.cloudflare.com';
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
export interface CloudflareRequestOptions {
  send?: typeof fetch;
  timeoutMs?: number;
}
function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function cancelBody(response: Response): void {
  try {
    void response.body?.cancel().catch(() => undefined);
  } catch {
    /* Best effort cancellation never exposes provider diagnostics. */
  }
}
async function boundedJson(response: Response, signal: AbortSignal): Promise<unknown> {
  if (signal.aborted) {
    cancelBody(response);
    throw new Error();
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error();
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener('abort', cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > MAX_RESPONSE_BYTES || signal.aborted) throw new Error();
      chunks.push(chunk.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    cancel();
    throw new Error();
  } finally {
    signal.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}
function responseInfo(value: unknown): CloudflareResponse['result_info'] {
  if (value === undefined || value === null) return undefined;
  if (!object(value)) throw new Error('Cloudflare returned unsupported pagination.');
  const info: NonNullable<CloudflareResponse['result_info']> = {};
  for (const field of ['page', 'total_pages', 'count', 'per_page'] as const) {
    const entry = value[field];
    if (entry !== undefined) {
      if (typeof entry !== 'number' || !Number.isSafeInteger(entry) || entry < 0)
        throw new Error('Cloudflare returned unsupported pagination.');
      info[field] = entry;
    }
  }
  return info;
}

/** Credentials stay in this closure. Fixed account paths, bounded response reads and
 * a whole-request deadline apply to reads and mutations; mutations never retry. */
export async function cloudflareRequest(
  project: ApplicationProject,
  directory: string,
  run: DeliveryRunner,
  env: NodeJS.ProcessEnv,
  options: CloudflareRequestOptions = {},
): Promise<CloudflareRequest> {
  const account = project.accountId;
  if (typeof account !== 'string' || !/^[a-f0-9]{32}$/.test(account))
    throw new Error('Select a valid Cloudflare account before provider requests.');
  const timeoutMs = options.timeoutMs ?? 30_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000)
    throw new Error('Invalid bounded Cloudflare request deadline.');
  const send = options.send ?? fetch;
  let credentials: unknown;
  try {
    const raw = await run('pnpm', ['exec', 'wrangler', 'auth', 'token', '--json'], directory, env);
    if (Buffer.byteLength(raw) > 64 * 1024) throw new Error();
    credentials = JSON.parse(raw);
  } catch {
    throw new Error(
      'Cannot retrieve structured Wrangler credentials; update Wrangler and check authentication.',
    );
  }
  if (
    !object(credentials) ||
    typeof credentials.type !== 'string' ||
    !['oauth', 'api_token'].includes(credentials.type) ||
    typeof credentials.token !== 'string' ||
    !/^[\x21-\x7e]{1,16384}$/.test(credentials.token)
  )
    throw new Error('Cloudflare operations require scoped API-token or Wrangler OAuth access.');
  const token = credentials.token;
  const prefix = `/client/v4/accounts/${account}`;
  return async (method, endpoint, body) => {
    let url: URL;
    try {
      if (typeof endpoint !== 'string') throw new Error();
      const decodedPath = decodeURIComponent(endpoint.split('?')[0]);
      if (
        !['GET', 'POST'].includes(method) ||
        endpoint.length > 4096 ||
        !endpoint.startsWith('/') ||
        endpoint.startsWith('//') ||
        /[\x00-\x20\x7f#\\]/.test(endpoint) ||
        decodedPath.includes('..') ||
        /[\x00-\x20\x7f#\\%]/.test(decodedPath)
      )
        throw new Error();
      url = new URL(`${prefix}${endpoint}`, ORIGIN);
      if (url.origin !== ORIGIN || !url.pathname.startsWith(`${prefix}/`)) throw new Error();
    } catch {
      throw new Error('Invalid account-scoped provider request.');
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        controller.abort();
        reject(
          new Error('Cloudflare request deadline exceeded; inspect remote status before retrying.'),
        );
      }, timeoutMs);
    });
    try {
      return await Promise.race([
        (async (): Promise<CloudflareResponse> => {
          let response: Response;
          try {
            response = await send(url.href, {
              method,
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: body === undefined ? undefined : JSON.stringify(body),
              redirect: 'error',
              signal: controller.signal,
            });
          } catch {
            throw new Error(
              'Cloudflare request failed; check connectivity and account permissions.',
            );
          }
          let data: unknown;
          try {
            data = await boundedJson(response, controller.signal);
          } catch {
            throw new Error(`Cloudflare returned unsupported output (HTTP ${response.status}).`);
          }
          if (!object(data))
            throw new Error(`Cloudflare returned unsupported output (HTTP ${response.status}).`);
          if (!response.ok || data.success !== true) {
            const codes = Array.isArray(data.errors)
              ? data.errors
                  .slice(0, 20)
                  .filter(object)
                  .map((item) => item.code)
                  .filter(
                    (code) =>
                      typeof code === 'number' &&
                      Number.isSafeInteger(code) &&
                      code >= 0 &&
                      code <= 1_000_000,
                  )
                  .join(',')
              : '';
            throw new Error(
              `Cloudflare operation failed (HTTP ${response.status}${codes ? `; codes ${codes}` : ''}). Check scoped permissions and service eligibility; no paid plan is activated automatically.`,
            );
          }
          if (!Object.hasOwn(data, 'result'))
            throw new Error('Cloudflare returned no operation result.');
          return { result: data.result, result_info: responseInfo(data.result_info) };
        })(),
        timeout,
      ]);
    } finally {
      clearTimeout(timer);
    }
  };
}
export async function listCloudflare(
  request: CloudflareRequest,
  endpoint: string,
): Promise<Record<string, unknown>[]> {
  const result: Record<string, unknown>[] = [];
  let bytes = 0;
  for (let page = 1; page <= 1000; page++) {
    const response = await request(
      'GET',
      `${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}&per_page=100`,
    );
    if (
      !Array.isArray(response.result) ||
      response.result.length > 100 ||
      response.result.some((item) => !object(item))
    )
      throw new Error('Unsupported provider resource list.');
    try {
      bytes += Buffer.byteLength(JSON.stringify(response.result));
    } catch {
      throw new Error('Unsupported provider resource list.');
    }
    if (result.length + response.result.length > 10_000 || bytes > 10 * 1024 * 1024)
      throw new Error('Provider resource listing exceeded its collection limit.');
    result.push(...response.result);
    const info = responseInfo(response.result_info);
    if (info?.total_pages !== undefined ? page >= info.total_pages : response.result.length < 100)
      return result;
  }
  throw new Error('Provider resource listing exceeded pagination limit.');
}
