import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { writeFile } from './util.js';
import { isMap, parseDocument } from 'yaml';

function policyBlock(key: string): RegExp {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `^(?:${escaped}|"${escaped}"|'${escaped}')[ \\t]*:.*(?:\\r?\\n|$)(?:[ \\t]+[^\\n]*(?:\\n|$)|#[^\\n]*(?:\\n|$)|[ \\t]*\\n)*`,
    'gm',
  );
}

/** Preserve unrelated starter YAML while replacing the settings this initializer owns. */
export function setPnpmPolicy(root: string, policy: Record<string, unknown>): void {
  const file = path.join(root, 'pnpm-workspace.yaml');
  let source = existsSync(file) ? readFileSync(file, 'utf8') : '';
  for (const [key, value] of Object.entries(policy)) {
    source = source.replace(policyBlock(key), '');
    if (value === undefined) continue;
    source += `${source.endsWith('\n') || !source ? '' : '\n'}${key}: ${JSON.stringify(value)}\n`;
  }
  writeFile(file, source);
}

/** Extend a pnpm patch map without replacing unrelated patches or YAML comments. */
export function pnpmPatchPolicy(source: string, coordinate: string, patch: string): string {
  const document = parseDocument(source);
  if (document.errors.length || !isMap(document.contents))
    throw new Error('Invalid pnpm workspace YAML; preserve and review its patch configuration.');
  let mapping = document.get('patchedDependencies', true);
  if (mapping === undefined) {
    document.set('patchedDependencies', document.createNode({}));
    mapping = document.get('patchedDependencies', true);
  }
  if (!isMap(mapping)) throw new Error('patchedDependencies must be an explicit YAML mapping.');
  const previous = mapping.get(coordinate);
  if (previous !== undefined && previous !== patch)
    throw new Error(`A different customer patch is already configured for ${coordinate}.`);
  if (previous === patch) return source;
  mapping.set(coordinate, patch);
  return document.toString({ lineWidth: 0 });
}
