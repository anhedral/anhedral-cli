import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const args = process.argv.slice(2);
if(args.length > 1 || args.some((v)=> !['--local','--remote'].includes(v))) throw Error('Use --local or explicitly --remote.');
if(!process.env.npm_execpath) throw Error('Run through pnpm db:migrate.');
const cwd=fileURLToPath(new URL('../../../apps/api/',import.meta.url));
const result=spawnSync(process.execPath,[process.env.npm_execpath,'exec','wrangler','d1','migrations','apply','DB',args[0] ?? '--local'],{cwd,stdio:'inherit',shell:false});
if(result.error)throw result.error;
process.exitCode=result.status ?? 1;
