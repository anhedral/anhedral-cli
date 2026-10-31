import { resolveStandardProducts } from './resolve.js';
import path from 'node:path';
import { packageNameFromText } from '../render.js';
import { CliArgumentError, commandArguments } from '../cli-arguments.js';
import type { StandardOptions, StandardProduct } from './types.js';

export function parseStandardOptions(args: readonly string[]): StandardOptions {
  // The exported parser historically accepted repeated identical booleans.
  // Executable validation still rejects duplicates before calling this API.
  const legacyBooleans = new Set([
    '--skip-install',
    '--dry-run',
    '--json',
    '--verbose',
    '--git',
    '--no-git',
  ]);
  const seen = new Set<string>();
  let literal = false;
  const normalized = args.filter((arg) => {
    if (arg === '--') literal = true;
    if (literal || !legacyBooleans.has(arg)) return true;
    if (seen.has(arg)) return false;
    seen.add(arg);
    return true;
  });
  const parsed = commandArguments('init', normalized);
  const hasDirectory = parsed.positional.length > 0;
  const directory = hasDirectory ? parsed.positional[0] : process.cwd();
  if (!directory)
    throw new CliArgumentError(
      'Specify a valid initialization directory.',
      'Run anhedral init --help.',
    );
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
