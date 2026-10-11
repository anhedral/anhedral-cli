import type { ResolvedStackRegistry } from '../registry/resolve.js';
import { put } from './files.js';

export function writeEnvironmentExample(root: string, registry: ResolvedStackRegistry): void {
  const names = [...new Set(registry.items.flatMap((item) => item.environment))].sort();
  put(root, '.env.example', names.map((name) => `${name}=`).join('\n') + '\n');
}
