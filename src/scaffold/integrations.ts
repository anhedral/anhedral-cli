import { readFileSync } from 'node:fs';
import path from 'node:path';
import { put } from './files.js';
import type { RecipeContext } from '../registry/types.js';
import { PRIVATE_FILES_SOURCE } from './private-files.js';

export function scaffoldPrivateFiles({ root }: RecipeContext): void {
  put(root, 'apps/api/src/private-files.ts', PRIVATE_FILES_SOURCE);
  const file = 'apps/api/src/index.ts';
  const source = readFileSync(path.join(root, file), 'utf8');
  put(
    root,
    file,
    "import { privateFileRoutes } from './private-files';\n" +
      source.replace(
        'export default app;',
        "app.route('/api/files', privateFileRoutes);\nexport default app;",
      ),
  );
}
