import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2);
if (args.length > 1 || args.some((arg) => !['--local', '--remote'].includes(arg)))
  throw new Error('Usage: pnpm db:migrate [--local|--remote] (defaults to local).');
const pnpm = process.env.npm_execpath;
if (!pnpm) throw new Error('Run migrations through pnpm db:migrate.');
const root = fileURLToPath(new URL('../../../apps/api/', import.meta.url));
const result = spawnSync(process.execPath, [pnpm, 'exec', 'wrangler', 'd1', 'migrations', 'apply', 'DB',
  args[0] ?? '--local', '--config', fileURLToPath(new URL('../../../apps/api/wrangler.jsonc', import.meta.url)),
], { cwd: root, stdio: 'inherit', shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
