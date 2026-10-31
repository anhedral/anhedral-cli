import { resolveStandardProducts } from './resolve.js';
import path from 'node:path';
import { packageNameFromText } from '../render.js';
import { commandArguments } from '../cli-arguments.js';
import type { StandardOptions, StandardProduct } from './types.js';

export function parseStandardOptions(args: readonly string[]): StandardOptions {
  const parsed = commandArguments('init', args);
  const hasDirectory = parsed.positional.length > 0;
  const directory = hasDirectory ? parsed.positional[0] : process.cwd();
  const root = path.resolve(directory);
  const products = new Set<StandardProduct>();
  const hosting = 'cloudflare' as const;
  resolveStandardProducts(products, hosting);
  return {
    root,
    name: packageNameFromText(path.basename(root)),
    products: [...products].sort(),
    hosting,
    skipInstall: parsed.has('--skip-install'),
    dryRun: parsed.has('--dry-run'),
    json: parsed.has('--json'),
    initializeGit: parsed.has('--git') || (!parsed.has('--no-git') && hasDirectory),
  };
}
