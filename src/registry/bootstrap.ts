import { SHADCN_VERSION } from '../dependencies.js';

const SHADCN_PACKAGE = `shadcn@${SHADCN_VERSION}`;
export const BOOTSTRAP_COMMAND = [
  'pnpm',
  'dlx',
  SHADCN_PACKAGE,
  'init',
  '--monorepo',
  '--template',
  'next',
] as const;
export function bootstrapArguments(name: string, cwd: string): string[] {
  return [...BOOTSTRAP_COMMAND.slice(1), '--defaults', '--name', name, '--cwd', cwd];
}
