import { spawnSync } from 'node:child_process';
const base = process.env.AUDIT_BASE;
const hasBase = base || ['origin/main', 'main'].find((ref) => spawnSync('git', ['rev-parse', '--verify', ref], { stdio: 'ignore' }).status === 0);
const args = hasBase ? ['exec', 'fallow', 'audit', '--base', hasBase] : ['exec', 'fallow', '--fail-on-issues'];
const entry = process.env.npm_execpath;
if (!entry) throw new Error('Run this check through pnpm run audit.');
const result = spawnSync(process.execPath, [entry, ...args], { stdio: 'inherit', shell: false });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
