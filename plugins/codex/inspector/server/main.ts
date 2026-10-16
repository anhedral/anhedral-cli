import { readFileSync } from 'node:fs';
import { catalogDirectory } from '../../../../src/catalog-registration.ts';
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { ProjectStore, catalogFailure } from './store.ts';
import { createDashboardServer } from './mcp.ts';
import { createPreviewServer } from './preview.ts';
const directory = catalogDirectory();
const store = new ProjectStore(directory);
const mode = process.argv[2] ?? 'serve';
if (mode === 'register') {
  const root = process.argv[3];
  if (!root) throw new Error('Usage: node server.mjs register <project-directory> [display-name]');
  console.log(store.register(root, process.argv[4]));
} else if (mode === 'recover-catalog-lock') {
  try {
    console.log(JSON.stringify(store.recoverCatalogLock()));
  } catch (error) {
    console.error(JSON.stringify(catalogFailure(error)));
    process.exitCode = 1;
  }
} else {
  const html = readFileSync(new URL('./dashboard.html', import.meta.url), 'utf8');
  if (mode === 'serve')
    await createDashboardServer(store, html).connect(new StdioServerTransport());
  else if (mode === 'preview') {
    const port = Number(process.env.ANHEDRAL_UI_PORT ?? 4317);
    if (!Number.isInteger(port) || port < 1024 || port > 65535)
      throw new Error('Choose an unprivileged local port.');
    const server = createPreviewServer(store, html);
    server.listen(port, '127.0.0.1', () =>
      console.log(`Anhedral Projects: http://127.0.0.1:${port}`),
    );
    process.on('SIGTERM', () => server.close());
    process.on('SIGINT', () => server.close());
  } else throw new Error('Use serve, preview, register or recover-catalog-lock.');
}
