import { writeProjectSection } from '../../../../src/project-config.ts';
import { createSetupPlan } from '../../../../src/capabilities.ts';
import { parseStandardOptions } from '../../../../src/standard.ts';
import { ProjectServices } from '../server/services.ts';
import { CloudflareRequestError } from '../../../../src/cloudflare.ts';
import { ProjectStore } from '../server/store.ts';
import { createPreviewServer } from '../server/preview.ts';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { build } from 'esbuild';
const root = mkdtempSync(path.join(tmpdir(), 'anhedral-dashboard-browser-'));
const store = new ProjectStore(path.join(root, 'catalog'));
for (const name of ['atlas', 'empty-app']) {
  const directory = path.join(root, name);
  const save = (file: string, value: unknown) => {
    mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
    writeFileSync(path.join(directory, file), JSON.stringify(value));
  };
  save('package.json', { name });
  // Synthetic source fixture: no dependencies are installed or cloud resources created.
  save('pnpm-lock.yaml', { lockfileVersion: '9.0' });
  if (name === 'atlas') {
    const options = parseStandardOptions([directory, '--skip-install', '--no-git']);
    writeProjectSection(directory, 'setup', createSetupPlan(options));
    save('apps/api/package.json', { name: '@atlas/api' });
    save('apps/api/wrangler.jsonc', {
      name: 'atlas-api',
      d1_databases: [{ binding: 'DB', database_id: 'database-id', database_name: 'atlas-data' }],
      r2_buckets: [{ binding: 'FILES', bucket_name: 'atlas-files' }],
    });
    const projectId = '00000000-0000-4000-8000-000000000001';
    writeProjectSection(directory, 'cloudflare', {
      schemaVersion: 1,
      id: projectId,
      name: 'atlas',
      ownership: 'customer',
      provider: 'cloudflare',
      deliveryEngine: 'wrangler',
      accountId: 'a'.repeat(32),
      audience: 'public',
      targets: [{ id: 'api', directory: 'apps/api', workerName: 'atlas-api' }],
    });
    save('.anhedral/resources.json', {
      schemaVersion: 1,
      projectId,
      accountId: 'a'.repeat(32),
      checkedAt: '2026-10-14T00:00:00.000Z',
      resources: [{ kind: 'd1', name: 'atlas-data', id: 'database-id', reused: false }],
    });
  }
  store.register(directory, name);
}
let databaseExists = true;
const services = new ProjectServices(
  store,
  async (_root, analytics) => async (method, endpoint, body) => {
    if (analytics) {
      const variables = (body as { variables: Record<string, string> }).variables;
      return {
        result: {
          viewer: {
            accounts: [
              {
                d1AnalyticsAdaptiveGroups: [
                  {
                    dimensions: { date: variables.start, databaseId: 'database-id' },
                    sum: { readQueries: 7, writeQueries: 2 },
                  },
                ],
              },
            ],
          },
        },
      };
    }
    if (method === 'DELETE') {
      databaseExists = false;
      return { result: null };
    }
    if (endpoint === '/workers/scripts?per_page=100') return { result: [{ id: 'atlas-api' }] };
    if (endpoint.endsWith('/settings'))
      return { result: { bindings: [{ type: 'd1', id: 'database-id' }] } };
    if (endpoint.endsWith('/query')) {
      const sql = (body as { sql: string }).sql;
      return {
        result: [
          {
            success: true,
            meta: { changes: 0, changed_db: false },
            results: sql.includes('sqlite_schema')
              ? [{ name: 'notes' }]
              : sql.startsWith('PRAGMA')
                ? [{ name: 'id' }, { name: 'email' }, { name: 'title' }]
                : [{ id: 1, title: 'Synthetic note', email: 'private@example.com' }],
          },
        ],
      };
    }
    if (!databaseExists) throw new CloudflareRequestError('Not found', 404);
    return { result: { uuid: 'database-id', name: 'atlas-data' } };
  },
);
const preview = createPreviewServer(
  store,
  readFileSync(new URL('../dist/dashboard.html', import.meta.url), 'utf8'),
  services,
);
const hostBundle = await build({
  entryPoints: [new URL('./host.ts', import.meta.url).pathname],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'browser',
});
const server = createServer((request, response) => {
  if (request.url?.split('?')[0] === '/host-fixture') {
    response
      .writeHead(200, { 'Content-Type': 'text/html' })
      .end(
        '<!doctype html><title>Test host</title><script type="module" src="/host-fixture.js"></script>',
      );
  } else if (request.url === '/host-fixture.js') {
    response
      .writeHead(200, { 'Content-Type': 'text/javascript' })
      .end(hostBundle.outputFiles[0].text);
  } else if (request.url === '/host-app') {
    // Only the synthetic host fixture embeds this build. Production preview's
    // frame-ancestors 'none' policy remains exercised by the preview tests.
    response
      .writeHead(200, { 'Content-Type': 'text/html' })
      .end(readFileSync(new URL('../dist/dashboard.html', import.meta.url), 'utf8'));
  } else preview.emit('request', request, response);
});
server.listen(4326, '127.0.0.1');
const close = () => {
  server.closeAllConnections();
  server.close(() => {
    rmSync(root, { recursive: true, force: true });
    process.exit(0);
  });
};
process.on('SIGINT', close);
process.on('SIGTERM', close);
