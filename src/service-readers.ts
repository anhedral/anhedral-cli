import { CloudflareRequestError, type CloudflareRequest } from './cloudflare.js';
import type {
  ServiceData,
  ServiceDescriptor,
  ServiceMetrics,
  ServiceObservation,
} from './service-model.js';
export const serviceEndpoint = (service: ServiceDescriptor) => {
  const id = encodeURIComponent(service.kind === 'r2' ? (service.name ?? service.id) : service.id);
  return {
    d1: `/d1/database/${id}`,
    r2: `/r2/buckets/${id}`,
    worker: `/workers/scripts/${id}/settings`,
  }[service.kind];
};
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Unsupported service response.');
  return value as Record<string, unknown>;
}
export async function observeService(
  service: ServiceDescriptor,
  request: CloudflareRequest,
): Promise<ServiceObservation> {
  const fetchedAt = new Date().toISOString();
  try {
    const value = record((await request('GET', serviceEndpoint(service))).result);
    const id = service.kind === 'd1' ? value.uuid : undefined;
    if (service.kind !== 'worker' && service.kind !== 'r2' && id !== service.id)
      throw new Error('Provider resource identity differs from the source.');
    const name = value.name ?? value.title ?? value.queue_name;
    if (
      name !== undefined &&
      (typeof name !== 'string' ||
        name.length > 256 ||
        (service.name !== null && name !== service.name))
    )
      throw new Error('Provider resource name differs from the source.');
    return {
      state: 'available',
      fetchedAt,
      ...(typeof name === 'string' ? { name } : {}),
      ...(service.kind === 'd1' &&
      typeof value.file_size === 'number' &&
      Number.isSafeInteger(value.file_size) &&
      value.file_size >= 0
        ? { storageBytes: value.file_size }
        : {}),
      message: 'Provider confirmed this resource exists. Application health is separate.',
    };
  } catch (error) {
    const status = error instanceof CloudflareRequestError ? error.status : undefined;
    return {
      state:
        status === 404
          ? 'not-found'
          : status === 401 || status === 403
            ? 'permission-required'
            : 'unavailable',
      fetchedAt,
      message:
        status === 404
          ? 'Resource not found in the selected account.'
          : status === 401 || status === 403
            ? 'Sign in with the required resource-read permissions.'
            : 'Service could not be verified. Check identity, connectivity, and provider availability.',
    };
  }
}
async function d1Query(
  service: ServiceDescriptor,
  request: CloudflareRequest,
  sql: string,
  params: unknown[] = [],
) {
  const value = (await request('POST', `${serviceEndpoint(service)}/query`, { sql, params }))
    .result;
  if (!Array.isArray(value) || value.length !== 1)
    throw new Error('Unsupported database response.');
  const result = record(value[0]);
  const meta = record(result.meta ?? {});
  if (
    result.success !== true ||
    meta.changed_db === true ||
    (typeof meta.changes === 'number' && meta.changes !== 0)
  )
    throw new Error('Read-only data operation did not complete safely.');
  if (!Array.isArray(result.results) || result.results.length > 1001)
    throw new Error('Database output exceeded its row limit.');
  return result.results.map(record);
}
export async function listServiceTables(
  service: ServiceDescriptor,
  request: CloudflareRequest,
): Promise<string[]> {
  if (service.kind !== 'd1') throw new Error('Schema browsing is supported for D1 databases.');
  const rows = await d1Query(
    service,
    request,
    "SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*' ORDER BY name LIMIT 1001",
  );
  if (rows.length > 1000) throw new Error('Database schema exceeds its table limit.');
  return rows.map((row) => {
    if (typeof row.name !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]{0,127}$/.test(row.name))
      throw new Error('Unsupported table identifier.');
    return row.name;
  });
}
export async function browseServiceData(
  service: ServiceDescriptor,
  request: CloudflareRequest,
  table: string,
  offset = 0,
  limit = 25,
  cursor?: string,
): Promise<ServiceData> {
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > 10_000 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw new Error('Choose a bounded data page.');
  if (cursor !== undefined && (cursor.length > 4096 || /[\x00-\x1f\x7f]/.test(cursor)))
    throw new Error('Choose a bounded metadata cursor.');
  if (cursor !== undefined) throw new Error('Database pages use offsets, not metadata cursors.');
  if (
    service.kind !== 'd1' ||
    !/^[a-zA-Z_][a-zA-Z0-9_]{0,127}$/.test(table) ||
    !(await listServiceTables(service, request)).includes(table)
  )
    throw new Error('Choose an existing supported database table.');
  const fields = await d1Query(service, request, `PRAGMA table_info("${table}")`);
  if (!fields.length || fields.length > 50)
    throw new Error('Table exceeds its supported column limit.');
  const columns = fields.map((field) => {
    if (typeof field.name !== 'string' || !/^[a-zA-Z_][a-zA-Z0-9_]{0,127}$/.test(field.name))
      throw new Error('Unsupported database column.');
    return field.name;
  });
  const sensitive =
    /password|secret|token|email|phone|address|authorization|cookie|session|private|credential/i;
  const projection = columns
    .map((column) =>
      sensitive.test(column)
        ? `'[masked]' AS "${column}"`
        : `CASE WHEN typeof("${column}") IN ('text', 'blob') THEN substr(CAST("${column}" AS TEXT), 1, 1000) ELSE "${column}" END AS "${column}"`,
    )
    .join(', ');
  const ordering = columns.map((_, index) => index + 1).join(', ');
  const rows = await d1Query(
    service,
    request,
    `SELECT ${projection} FROM "${table}" ORDER BY ${ordering} LIMIT ? OFFSET ?`,
    [limit + 1, offset],
  );
  let masked = columns.some((column) => sensitive.test(column));
  const outputRows = rows.slice(0, limit).map((row) =>
    columns.map((column) => {
      const value = row[column];
      if (sensitive.test(column)) {
        masked = true;
        return '[masked]';
      }
      if (value === null || typeof value === 'boolean' || typeof value === 'number')
        return value as number | boolean | null;
      if (typeof value === 'string') {
        if (/^(?:sk[-_]|rk[-_]|whsec[-_]|Bearer )/i.test(value)) {
          masked = true;
          return '[masked]';
        }
        return value.slice(0, 1000);
      }
      return '[complex value]';
    }),
  );
  return {
    fetchedAt: new Date().toISOString(),
    columns,
    offset,
    hasMore: rows.length > limit,
    masked,
    rows: outputRows,
  };
}
export async function readServiceMetrics(
  service: ServiceDescriptor,
  analytics: CloudflareRequest,
  hours = 24,
): Promise<ServiceMetrics> {
  if (
    ![1, 24, 168].includes(hours) ||
    !['worker', 'd1'].includes(service.kind) ||
    (service.kind === 'd1' && hours === 1)
  )
    throw new Error('Unsupported service or analytics window.');
  const worker = service.kind === 'worker';
  const end = worker
    ? new Date().toISOString()
    : new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z').toISOString();
  const start = new Date(Date.parse(end) - hours * 3600000).toISOString();
  const query = worker
    ? `query($accountTag: string!, $id: string!, $start: string!, $end: string!) { viewer { accounts(filter: {accountTag: $accountTag}) { workersInvocationsAdaptive(limit: 1000, filter: {scriptName: $id, datetime_geq: $start, datetime_leq: $end}) { dimensions { datetime scriptName } sum { requests errors } quantiles { cpuTimeP50 cpuTimeP99 } } } } }`
    : `query($accountTag: string!, $id: string!, $start: Date!, $end: Date!) { viewer { accounts(filter: {accountTag: $accountTag}) { d1AnalyticsAdaptiveGroups(limit: 1000, filter: {databaseId: $id, date_geq: $start, date_leq: $end}, orderBy: [date_ASC]) { dimensions { date databaseId } sum { readQueries writeQueries } quantiles { queryBatchTimeMsP90 } } } } }`;
  const response = record(
    (
      await analytics('POST', '/graphql', {
        query,
        variables: {
          accountTag: service.accountId,
          id: service.id,
          start: worker ? start : start.slice(0, 10),
          end: worker ? end : new Date(Date.parse(end) - 1).toISOString().slice(0, 10),
        },
      })
    ).result,
  );
  const accounts = record(response.viewer).accounts;
  if (!Array.isArray(accounts) || accounts.length !== 1)
    throw new Error('Analytics account response is unavailable.');
  const rows = record(accounts[0])[
    worker ? 'workersInvocationsAdaptive' : 'd1AnalyticsAdaptiveGroups'
  ];
  if (!Array.isArray(rows) || rows.length >= 1000)
    throw new Error('Analytics is truncated or unavailable; choose a smaller window.');
  const names = worker ? ['requests', 'errors'] : ['readQueries', 'writeQueries'];
  const points = rows
    .map((entry) => {
      const value = record(entry);
      const dimensions = record(value.dimensions);
      const sum = record(value.sum);
      if (dimensions[worker ? 'scriptName' : 'databaseId'] !== service.id)
        throw new Error('Analytics resource identity differs from the selection.');
      const time = dimensions[worker ? 'datetime' : 'date'];
      if (
        typeof time !== 'string' ||
        !Number.isFinite(Date.parse(time)) ||
        Date.parse(time) < Date.parse(start) ||
        Date.parse(time) > Date.parse(end)
      )
        throw new Error('Invalid analytics time.');
      const values: Record<string, number> = {};
      for (const name of names) {
        if (typeof sum[name] !== 'number' || !Number.isFinite(sum[name]) || Number(sum[name]) < 0)
          throw new Error('Invalid analytics count.');
        values[name] = Number(sum[name]);
      }
      const quantiles = record(value.quantiles ?? {});
      for (const name of worker ? ['cpuTimeP50', 'cpuTimeP99'] : ['queryBatchTimeMsP90'])
        if (
          typeof quantiles[name] === 'number' &&
          Number.isFinite(quantiles[name]) &&
          Number(quantiles[name]) >= 0
        )
          values[name] = Number(quantiles[name]);
      return { time, values };
    })
    .sort((a, b) => a.time.localeCompare(b.time));
  return {
    fetchedAt: new Date().toISOString(),
    start,
    end,
    timezone: 'UTC',
    source: worker ? 'Cloudflare Workers GraphQL' : 'Cloudflare D1 GraphQL (daily buckets)',
    sampled: true,
    points,
    units: {
      ...Object.fromEntries(names.map((name) => [name, 'count'])),
      ...(worker
        ? { cpuTimeP50: 'microseconds', cpuTimeP99: 'microseconds' }
        : { queryBatchTimeMsP90: 'milliseconds' }),
    },
  };
}
