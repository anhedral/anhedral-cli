import type { RecipeContext } from '../registry/types.js';
import { workerConfig, worker } from './files.js';
export function scaffoldApi({ root, options, bindings }: RecipeContext): void {
  worker(
    root,
    'api',
    { ...workerConfig(`${options.name}-api`), ...bindings },
    `import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
const app = new OpenAPIHono<{ Bindings: Env }>();
app.openapi(createRoute({ method: 'get', path: '/health', responses: { 200: { description: 'Healthy', content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } } } } }), (c) => c.json({ ok: true as const }, 200));
app.doc('/openapi.json', { openapi: '3.0.0', info: { title: '${options.name}', version: '1.0.0' } });
export default app;
`,
    { hono: '^4.0.0', '@hono/zod-openapi': '^1.0.0' },
  );
}
