import { createSetupPlan } from '../../src/capabilities.ts';
import { parseStandardOptions } from '../../src/standard.ts';
import { ProjectStore } from '../server/store.ts';
import { createPreviewServer } from '../server/preview.ts';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
const root = mkdtempSync(path.join(tmpdir(), 'anhedral-dashboard-browser-'));
const store = new ProjectStore(path.join(root, 'catalog'));
for (const name of ['atlas', 'empty-app']) {
  const directory = path.join(root, name);
  const save = (file: string, value: unknown) => {
    mkdirSync(path.dirname(path.join(directory, file)), { recursive: true });
    writeFileSync(path.join(directory, file), JSON.stringify(value));
  };
  save('package.json', { name });
  if (name === 'atlas') {
    const options = parseStandardOptions('init', [
      directory,
      '--hono',
      '--d1',
      '--r2',
      '--skip-install',
      '--no-git',
    ]);
    save('anhedral.setup.json', createSetupPlan(options));
    save('apps/api/package.json', { name: '@atlas/api' });
    save('apps/api/wrangler.jsonc', {
      name: 'atlas-api',
      d1_databases: [{ binding: 'DB', database_id: 'database-id', database_name: 'atlas-data' }],
      r2_buckets: [{ binding: 'FILES', bucket_name: 'atlas-files' }],
    });
    const projectId = '00000000-0000-4000-8000-000000000001';
    save('anhedral.project.json', {
      schemaVersion: 1,
      id: projectId,
      name: 'atlas',
      ownership: 'customer',
      provider: 'cloudflare',
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
const server = createPreviewServer(
  store,
  readFileSync(new URL('../dist/dashboard.html', import.meta.url), 'utf8'),
);
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
