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

/** Credentials stay in this closure, never in returned receipts, arguments or files. */
export async function cloudflareRequest(
  project: ApplicationProject,
  directory: string,
  run: DeliveryRunner,
  env: NodeJS.ProcessEnv,
): Promise<CloudflareRequest> {
  let credentials;
  try {
    credentials = JSON.parse(
      await run('pnpm', ['exec', 'wrangler', 'auth', 'token', '--json'], directory, env),
    );
  } catch {
    throw new Error(
      'Cannot retrieve structured Wrangler credentials; update Wrangler and check authentication.',
    );
  }
  if (
    !['oauth', 'api_token'].includes(credentials.type) ||
    typeof credentials.token !== 'string' ||
    !credentials.token
  )
    throw new Error('Cloudflare operations require scoped API-token or Wrangler OAuth access.');
  return async (method, endpoint, body) => {
    if (
      !project.accountId ||
      !endpoint.startsWith('/') ||
      endpoint.includes('..') ||
      endpoint.includes('#')
    )
      throw new Error('Invalid account-scoped provider request.');
    let response: Response;
    try {
      response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${project.accountId}${endpoint}`,
        {
          method,
          headers: {
            Authorization: `Bearer ${credentials.token}`,
            'Content-Type': 'application/json',
          },
          body: body === undefined ? undefined : JSON.stringify(body),
          redirect: 'error',
          signal: AbortSignal.timeout(30_000),
        },
      );
    } catch {
      throw new Error('Cloudflare request failed; check connectivity and account permissions.');
    }
    let data;
    try {
      data = (await response.json()) as {
        success?: boolean;
        result?: unknown;
        result_info?: CloudflareResponse['result_info'];
        errors?: { code?: number }[];
      };
    } catch {
      throw new Error(`Cloudflare returned unsupported output (HTTP ${response.status}).`);
    }
    if (!response.ok || data.success !== true) {
      const codes = (data.errors ?? [])
        .map((item) => item.code)
        .filter((code) => typeof code === 'number')
        .join(',');
      throw new Error(
        `Cloudflare operation failed (HTTP ${response.status}${codes ? `; codes ${codes}` : ''}). Check scoped permissions and service eligibility; no paid plan is activated automatically.`,
      );
    }
    return { result: data.result, result_info: data.result_info };
  };
}
export async function listCloudflare(
  request: CloudflareRequest,
  endpoint: string,
): Promise<Record<string, unknown>[]> {
  const result: Record<string, unknown>[] = [];
  for (let page = 1; page <= 1000; page++) {
    const response = await request(
      'GET',
      `${endpoint}${endpoint.includes('?') ? '&' : '?'}page=${page}&per_page=100`,
    );
    if (
      !Array.isArray(response.result) ||
      response.result.some((item) => !item || typeof item !== 'object')
    )
      throw new Error('Unsupported provider resource list.');
    result.push(...response.result);
    const info = response.result_info;
    if (info?.total_pages !== undefined ? page >= info.total_pages : response.result.length < 100)
      return result;
  }
  throw new Error('Provider resource listing exceeded pagination limit.');
}
