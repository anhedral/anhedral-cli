import { scaffoldContracts } from './backend.js';
import { resourceName, jsString } from '../render.js';
import { STACK_DEPENDENCIES } from '../dependencies.js';
import type { RecipeContext } from '../registry/types.js';
import { workerConfig, worker } from './files.js';
export function scaffoldApi({ root, options, bindings }: RecipeContext): void {
  scaffoldContracts(root);
  worker(
    root,
    'api',
    { ...workerConfig(resourceName(options.name, 'api')), ...bindings },
    `import { OpenAPIHono, createRoute } from '@hono/zod-openapi';

import { healthSchema } from '@workspace/contracts';
import { bodyLimit } from 'hono/body-limit';

const app = new OpenAPIHono<{ Bindings: Env }>();
app.use('/api/*', bodyLimit({ maxSize: 1024 * 1024 }));
const health = createRoute({
  method: 'get',
  path: '/health',
  responses: {
    200: {
      description: 'Healthy',
      content: { 'application/json': { schema: healthSchema } },
    },
  },
});

app.openapi(health, (c) => c.json({ ok: true as const }, 200));
app.get('/api/health', (c) => c.json(healthSchema.parse({ ok: true })));
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: { title: ${jsString(options.name)}, version: '1.0.0' },
});

export default app;
`,
    {
      '@workspace/contracts': 'workspace:*',
      hono: STACK_DEPENDENCIES['hono'],
      '@hono/zod-openapi': STACK_DEPENDENCIES['@hono/zod-openapi'],
    },
  );
}
