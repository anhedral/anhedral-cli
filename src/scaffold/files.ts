import { readFileSync } from 'node:fs';
import path from 'node:path';

import { writeFile } from '../util.js';

export function launchTemplate(name: string): string {
  return readFileSync(new URL(`../../assets/launch/${name}`, import.meta.url), 'utf8');
}

export function stackTemplate(name: string): string {
  return readFileSync(new URL(`../../assets/stack/${name}`, import.meta.url), 'utf8');
}

export function json(root: string, file: string, value: unknown): void {
  writeFile(path.join(root, file), JSON.stringify(value, null, 2) + '\n');
}

export function put(root: string, file: string, value: string): void {
  writeFile(path.join(root, file), value);
}

export function workerConfig(name: string, main: string, compatibilityDate: string) {
  return {
    $schema: 'node_modules/wrangler/config-schema.json',
    name,
    main,
    compatibility_date: compatibilityDate,
    compatibility_flags: ['nodejs_compat'],
    observability: { enabled: true },
  };
}
