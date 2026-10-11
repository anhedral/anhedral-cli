import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { ResolvedStackRegistry } from '../registry/resolve.js';
import { put } from './files.js';

/** Extend examples without discarding earlier recipe defaults or customer comments. */
export function writeEnvironmentFile(
  root: string,
  file: string,
  variables: Record<string, string>,
): void {
  const destination = path.join(root, file);
  let content = existsSync(destination) ? readFileSync(destination, 'utf8') : '';
  const keys = new Set(
    [...content.matchAll(/^[ \t]*(?:export[ \t]+)?([A-Z][A-Z0-9_]*)[ \t]*=/gm)].map(
      (match) => match[1],
    ),
  );
  const additions = Object.entries(variables)
    .filter(([key]) => !keys.has(key))
    .map(([key, value]) => `${key}=${value}`);
  if (additions.length) {
    if (content && !content.endsWith('\n')) content += '\n';
    content += additions.join('\n') + '\n';
  }
  put(root, file, content || '\n');
}

export function writeEnvironmentExample(root: string, registry: ResolvedStackRegistry): void {
  const names = [...new Set(registry.items.flatMap((item) => item.environment))].sort();
  writeEnvironmentFile(root, '.env.example', Object.fromEntries(names.map((name) => [name, ''])));
}
