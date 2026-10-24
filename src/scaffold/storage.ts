import { put } from './files.js';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { RecipeContext } from '../registry/types.js';
export function scaffoldPrivateStorage({ root }: RecipeContext): void {
  put(
    root,
    'apps/api/src/private-storage.ts',
    `// Use only after your application has authorized the operation. No HTTP routes are exposed.
// R2 bucket privacy does not establish end-user authorization.
export function privateStorage(binding: R2Bucket) {
  return {
    get: (key: string) => binding.get(key),
    put: (key: string, value: ArrayBuffer | ReadableStream) => binding.put(key, value),
    delete: (key: string) => binding.delete(key),
  };
}
`,
  );
  const file = 'apps/api/src/index.ts';
  const source = readFileSync(path.join(root, file), 'utf8');
  put(
    root,
    file,
    "import { privateStorage } from './private-storage';\n" +
      source
        .replace(
          'database: () => ReturnType<typeof createDatabase>',
          'database: () => ReturnType<typeof createDatabase>; storage: () => ReturnType<typeof privateStorage>',
        )
        .replace(
          "c.set('database', () => createDatabase(c.env.DB));",
          "c.set('database', () => createDatabase(c.env.DB)); c.set('storage', () => privateStorage(c.env.FILES));",
        ),
  );
}
