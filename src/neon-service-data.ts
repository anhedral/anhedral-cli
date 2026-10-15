import { neon } from '@neondatabase/serverless';
import { setting } from './providers/config.js';
import type { ApiRequest } from './providers/api.js';
import { record } from './service-readers.js';
import {
  inspectIntegrationResource,
  type IntegrationService,
} from './integration-service-readers.js';
import type { ServiceData } from './service-model.js';
const identifier = (value: string) => {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{0,127}$/.test(value))
    throw new Error('Unsupported database identifier.');
  return `"${value}"`;
};
const sensitive =
  /password|secret|token|email|phone|address|authorization|cookie|session|private|credential/i;
export type NeonRead = (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
export async function neonReadConnection(
  service: IntegrationService,
  api: ApiRequest,
  env: NodeJS.ProcessEnv = process.env,
  createClient: typeof neon = neon,
): Promise<NeonRead> {
  if (service.provider !== 'neon') throw new Error('Choose the selected Neon project.');
  const project = await inspectIntegrationResource(service, api);
  const connection =
    env[
      `ANHEDRAL_NEON_READONLY_URL_${String(project.id)
        .replace(/[^a-zA-Z0-9]/g, '_')
        .toUpperCase()}`
    ] ?? env.ANHEDRAL_NEON_READONLY_URL;
  if (!connection)
    throw new Error('Provide ANHEDRAL_NEON_READONLY_URL for a restricted read-only role.');
  let url: URL;
  try {
    url = new URL(connection);
  } catch {
    throw new Error('Invalid read-only database connection.');
  }
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !url.hostname.endsWith('.neon.tech') ||
    !url.username ||
    !url.password ||
    (url.port && url.port !== '5432') ||
    decodeURIComponent(url.pathname.slice(1)) !== setting(service.settings, 'database')
  )
    throw new Error('Read-only database connection does not match selected configuration.');
  const endpoints = record(await api(`/api/v2/projects/${project.id}/endpoints`)).endpoints;
  if (
    !Array.isArray(endpoints) ||
    endpoints.length > 100 ||
    !endpoints.some((endpoint) => record(endpoint).host === url.hostname.replace(/-pooler\./, '.'))
  )
    throw new Error('Database endpoint does not belong to the selected Neon project.');
  const sql = createClient(connection);
  return async (query, params = []) => {
    try {
      const result = await sql.transaction(
        [
          sql.query("SELECT set_config('statement_timeout','5000',true)"),
          sql.query(
            "SELECT current_setting('transaction_read_only') = 'on' AS read_only, (SELECT rolsuper OR rolcreatedb OR rolcreaterole FROM pg_roles WHERE rolname = current_user) AS privileged, EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p') AND has_table_privilege(current_user,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE')) AS writable",
          ),
          sql.query(query, params),
        ],
        {
          readOnly: true,
          isolationLevel: 'RepeatableRead',
          fetchOptions: { signal: AbortSignal.timeout(10000), redirect: 'error' },
        },
      );
      const role = result[1]?.[0];
      if (role?.read_only !== true || role.privileged !== false || role.writable !== false)
        throw new Error('Restricted read-only role required.');
      if (!Array.isArray(result[2]) || result[2].length > 1001)
        throw new Error('Database response exceeded limits.');
      return result[2].map(record);
    } catch {
      throw new Error(
        'Neon read failed. Check the selected endpoint, restricted role, read permissions and query limits.',
      );
    }
  };
}
export async function listNeonTables(read: NeonRead): Promise<string[]> {
  const rows = await read(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name LIMIT 1001",
  );
  if (rows.length > 1000) throw new Error('Database schema exceeds its table limit.');
  return rows.map((row) => {
    if (typeof row.name !== 'string') throw new Error('Invalid database table.');
    identifier(row.name);
    return row.name;
  });
}
export async function browseNeonData(
  read: NeonRead,
  table: string,
  offset = 0,
): Promise<ServiceData> {
  identifier(table);
  if (
    !Number.isSafeInteger(offset) ||
    offset < 0 ||
    offset > 10000 ||
    !(await listNeonTables(read)).includes(table)
  )
    throw new Error('Choose a bounded existing table page.');
  const fields = await read(
    "SELECT column_name AS name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position LIMIT 51",
    [table],
  );
  if (fields.length > 50 || !fields.length)
    throw new Error('Table exceeds its supported column limit.');
  const columns = fields.map((row) => {
    if (typeof row.name !== 'string') throw new Error('Invalid database column.');
    identifier(row.name);
    return row.name;
  });
  const projection = columns
    .map((column) =>
      sensitive.test(column)
        ? `'[masked]'::text AS ${identifier(column)}`
        : `left(${identifier(column)}::text,1000) AS ${identifier(column)}`,
    )
    .join(', ');
  const rows = await read(
    `SELECT ${projection} FROM public.${identifier(table)} LIMIT $1 OFFSET $2`,
    [26, offset],
  );
  let masked = columns.some((column) => sensitive.test(column));
  const outputRows = rows.slice(0, 25).map((row) =>
    columns.map((column) => {
      const value = row[column];
      if (value === null) return null;
      if (typeof value !== 'string') throw new Error('Unsupported database value.');
      if (/^(?:sk[-_]|rk[-_]|whsec[-_]|Bearer )/i.test(value)) {
        masked = true;
        return '[masked]';
      }
      return value.slice(0, 1000);
    }),
  );
  return {
    fetchedAt: new Date().toISOString(),
    columns,
    rows: outputRows,
    offset,
    hasMore: rows.length > 25,
    masked,
  };
}
