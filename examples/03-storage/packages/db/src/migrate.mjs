import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2);
if (args.length > 1 || args.some((flag) => !['--local', '--remote'].includes(flag)))
  throw Error('Use --local or explicitly --remote.');
const url = URL.parse(process.env.DATABASE_URL_UNPOOLED ?? '');
if (!url || !['postgresql:', 'postgres:'].includes(url.protocol))
  throw Error('Set DATABASE_URL_UNPOOLED to the direct PostgreSQL connection string.');
if (
  args[0] !== '--remote' &&
  (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) ||
    [...url.searchParams.keys()].some((key) => !['sslmode'].includes(key)))
)
  throw Error('Local migrations require a loopback PostgreSQL URL. Use --remote for Neon.');
if (!process.env.npm_execpath) throw Error('Run through pnpm db:migrate.');
const cwd = fileURLToPath(new URL('../', import.meta.url));
const result = spawnSync(
  process.execPath,
  [process.env.npm_execpath, 'exec', 'drizzle-kit', 'migrate'],
  { cwd, stdio: 'inherit', shell: false },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
