import { createHash } from 'node:crypto';
import type { IntegrationProvider, ProviderSettings } from './config.js';
import { PROVIDER_DEFINITIONS, type ProviderDefinition } from './definitions.js';

export type ApiObject = Record<string, unknown>;
export function object(value: unknown): ApiObject {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Provider returned an invalid resource.');
  return value as ApiObject;
}
export function list(value: unknown): ApiObject[] {
  if (!Array.isArray(value)) throw new Error('Provider returned an invalid resource list.');
  return value.map(object);
}
export function text(value: unknown): string {
  if (typeof value !== 'string' || !value || value.length > 16384 || /[\r\n\x00]/.test(value))
    throw new Error('Provider returned an invalid resource field.');
  return value;
}
export function resourceId(value: unknown): string {
  const id =
    typeof value === 'number' && Number.isSafeInteger(value) && value > 0
      ? String(value)
      : text(value);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,254}$/.test(id))
    throw new Error('Provider returned an invalid resource ID.');
  return id;
}
export function digest(value: unknown): string {
  const canonical = (item: unknown): unknown =>
    Array.isArray(item)
      ? item.map(canonical)
      : item && typeof item === 'object'
        ? Object.fromEntries(
            Object.entries(item)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, entry]) => [key, canonical(entry)]),
          )
        : item;
  return createHash('sha256')
    .update(JSON.stringify(canonical(value)))
    .digest('hex');
}

export const CREDENTIALS = Object.fromEntries(
  Object.entries(PROVIDER_DEFINITIONS).map(([id, definition]) => [id, definition.credential]),
) as Record<IntegrationProvider, string>;

export interface ApiRequest {
  (
    route: string,
    method?: 'GET' | 'POST' | 'PATCH',
    body?: ApiObject,
    operation?: string,
  ): Promise<unknown>;
}

export class ProviderRequestError extends Error {
  constructor(
    message: string,
    readonly rejected: boolean,
    readonly status?: number,
  ) {
    super(message);
  }
}

export interface ProviderRetryOptions {
  /** Reads only; provider mutations always receive exactly one attempt. */
  maxAttempts?: number;
  totalTimeoutMs?: number;
  attemptTimeoutMs?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  delay?: (milliseconds: number) => Promise<void>;
}
class TransportFailure extends Error {}
class RequestTimeout extends TransportFailure {}
function retryPolicy(options: ProviderRetryOptions) {
  const policy = {
    maxAttempts: options.maxAttempts ?? 3,
    totalTimeoutMs: options.totalTimeoutMs ?? 30_000,
    attemptTimeoutMs: options.attemptTimeoutMs ?? 10_000,
    baseDelayMs: options.baseDelayMs ?? 100,
    maxDelayMs: options.maxDelayMs ?? 2_000,
    delay:
      options.delay ??
      ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds))),
  };
  if (
    !Number.isInteger(policy.maxAttempts) ||
    policy.maxAttempts < 1 ||
    policy.maxAttempts > 5 ||
    [policy.totalTimeoutMs, policy.attemptTimeoutMs].some(
      (value) => !Number.isInteger(value) || value < 1 || value > 30_000,
    ) ||
    [policy.baseDelayMs, policy.maxDelayMs].some(
      (value) => !Number.isInteger(value) || value < 0 || value > 2_000,
    ) ||
    policy.baseDelayMs > policy.maxDelayMs ||
    typeof policy.delay !== 'function'
  )
    throw new Error('Invalid bounded provider retry policy.');
  return policy;
}
async function deadline<T>(
  milliseconds: number,
  operation: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new RequestTimeout());
    }, milliseconds);
  });
  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}
function cancelBody(response: Response): void {
  try {
    void response.body?.cancel().catch(() => undefined);
  } catch {
    /* Cancellation is best effort; diagnostics stay sanitized. */
  }
}
async function responseJson(
  id: IntegrationProvider,
  response: Response,
  signal: AbortSignal,
): Promise<unknown> {
  if (signal.aborted) {
    cancelBody(response);
    throw new RequestTimeout();
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error(`${id}: provider returned an empty response.`);
  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };
  signal.addEventListener('abort', cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    for (;;) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch {
        throw new TransportFailure();
      }
      if (chunk.done) break;
      bytes += chunk.value.length;
      if (bytes > 2 * 1024 * 1024) throw new Error('Response exceeded size limit.');
      chunks.push(chunk.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch (error) {
    cancel();
    if (signal.aborted) throw new RequestTimeout();
    if (error instanceof TransportFailure) throw error;
    throw new Error(`${id}: provider returned invalid or oversized JSON.`);
  } finally {
    signal.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}
function requestedDelay(value: string | null, maximum: number): number | undefined {
  if (!value) return 0;
  const milliseconds = /^\d+(?:\.\d+)?$/.test(value)
    ? Number(value) * 1000
    : Date.parse(value) - Date.now();
  if (!Number.isFinite(milliseconds)) return 0;
  // Do not retry sooner than a provider's long waiting requirement. Return the
  // sanitized error when that wait exceeds this deliberately short retry budget.
  return milliseconds > maximum ? undefined : Math.max(0, Math.ceil(milliseconds));
}

/** Fixed origins, bounded reads and sanitized errors keep management keys out of output.
 * Only GET requests retry transient failures; unknown mutation outcomes never replay. */
export function providerApi(
  id: IntegrationProvider,
  settings: ProviderSettings,
  environment: NodeJS.ProcessEnv,
  send: typeof fetch,
  options: ProviderRetryOptions = {},
): ApiRequest {
  const token = environment[CREDENTIALS[id]];
  if (!token || /[^\x21-\x7e]/.test(token)) throw new Error(`${id}: supply ${CREDENTIALS[id]}.`);
  const policy = retryPolicy(options);
  const definition: ProviderDefinition = PROVIDER_DEFINITIONS[id];
  const origin = definition.regionalOrigins?.[settings.region ?? ''] ?? definition.origin;
  return async (route, method = 'GET', body, operation) => {
    if (
      !route.startsWith('/') ||
      route.startsWith('//') ||
      route.includes('..') ||
      /[\r\n#\\]/.test(route)
    )
      throw new Error('Invalid provider API path.');
    const url = new URL(route, origin);
    if (url.origin !== origin) throw new Error('Provider API origin changed.');
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };
    let payload: string | undefined;
    if (body) {
      if (id === 'stripe') {
        const form = new URLSearchParams();
        for (const [key, value] of Object.entries(body)) {
          if (Array.isArray(value))
            for (const entry of value) form.append(`${key}[]`, String(entry));
          else form.set(key, String(value));
        }
        payload = form.toString();
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      } else {
        payload = JSON.stringify(body);
        headers['Content-Type'] = 'application/json';
      }
    }
    if (operation && (id === 'stripe' || id === 'resend')) headers['Idempotency-Key'] = operation;
    const started = performance.now();
    const attempts = method === 'GET' ? policy.maxAttempts : 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const remaining = policy.totalTimeoutMs - (performance.now() - started);
      if (remaining <= 0) throw new Error(`${id}: provider read retry deadline exceeded.`);
      let retryAfter = 0;
      try {
        return await deadline(
          Math.min(remaining, method === 'GET' ? policy.attemptTimeoutMs : policy.totalTimeoutMs),
          async (signal) => {
            let response: Response;
            try {
              response = await send(url.toString(), {
                method,
                headers,
                body: payload,
                redirect: 'error',
                signal,
              });
            } catch {
              throw new TransportFailure();
            }
            if (!response.ok) {
              retryAfter =
                requestedDelay(response.headers.get('Retry-After'), policy.maxDelayMs) ?? -1;
              cancelBody(response);
              throw new ProviderRequestError(
                `${id}: provider request failed (HTTP ${response.status}). Check account, permissions and quota.`,
                response.status >= 400 &&
                  response.status < 500 &&
                  ![408, 429].includes(response.status),
                response.status,
              );
            }
            return responseJson(id, response, signal);
          },
        );
      } catch (error) {
        const retryable =
          error instanceof TransportFailure ||
          (error instanceof ProviderRequestError &&
            [429, 502, 503, 504].includes(error.status ?? 0));
        const failure =
          error instanceof TransportFailure
            ? new Error(
                `${id}: provider request did not complete. Inspect remote status before retrying.`,
              )
            : error;
        if (method !== 'GET' || !retryable || retryAfter < 0 || attempt + 1 >= attempts)
          throw failure;
        const delay = Math.max(
          retryAfter,
          Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** attempt),
        );
        const budget = policy.totalTimeoutMs - (performance.now() - started);
        if (delay >= budget) throw failure;
        try {
          await deadline(budget, async () => policy.delay(delay));
        } catch {
          throw new Error(`${id}: provider read retry deadline exceeded.`);
        }
      }
    }
    throw new Error(`${id}: provider read retry deadline exceeded.`);
  };
}
