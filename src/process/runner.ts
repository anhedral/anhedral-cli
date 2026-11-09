// Internal synchronous-runner companion. Owns only its spawned command tree.
import { spawn, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { readBoundedFile } from '../bounded-file.js';
const [configuration, resultFile] = process.argv.slice(2);
if (!configuration || !resultFile)
  throw Error('Command runner requires private input and result files.');
const input = JSON.parse(readBoundedFile(configuration, 1024 * 1024).toString('utf8')) as {
  command: string;
  args: string[];
  cwd: string;
  timeout: number;
  maximum: number;
  verbose: boolean;
};
if (
  typeof input.command !== 'string' ||
  !Array.isArray(input.args) ||
  input.args.some((value) => typeof value !== 'string') ||
  typeof input.cwd !== 'string' ||
  !Number.isInteger(input.timeout) ||
  input.timeout < 1 ||
  input.timeout > 1200000 ||
  !Number.isInteger(input.maximum) ||
  input.maximum < 1024 ||
  input.maximum > 16 * 1024 * 1024
)
  throw Error('Invalid command runner configuration.');
const child = spawn(input.command, input.args, {
  cwd: input.cwd,
  shell: false,
  detached: process.platform !== 'win32',
  stdio: ['ignore', 'pipe', 'pipe'],
  windowsHide: true,
});
let stdout = Buffer.alloc(0),
  stderr = Buffer.alloc(0),
  total = 0,
  error: string | undefined,
  completed = false;
const tail = (previous: Buffer, chunk: Buffer) =>
  Buffer.concat([previous, chunk]).subarray(-128 * 1024);
function stopTree() {
  if (!child.pid) return;
  if (process.platform === 'win32')
    spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      shell: false,
      stdio: 'ignore',
      windowsHide: true,
      timeout: 5000,
    });
  else
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
}
const timer = setTimeout(() => {
  error = 'ETIMEDOUT';
  stopTree();
}, input.timeout);
function finish(status: number | null) {
  if (completed) return;
  completed = true;
  clearTimeout(timer);
  writeFileSync(
    resultFile,
    JSON.stringify({
      status,
      error,
      stdout: stdout.toString('base64'),
      stderr: stderr.toString('base64'),
    }),
    { flag: 'wx', mode: 0o600 },
  );
}
for (const [stream, name] of [
  [child.stdout, 'stdout'],
  [child.stderr, 'stderr'],
] as const)
  stream.on('data', (chunk: Buffer) => {
    total += chunk.length;
    if (name === 'stdout') stdout = tail(stdout, chunk);
    else stderr = tail(stderr, chunk);
    if (input.verbose) process[name].write(chunk);
    if (total > input.maximum && !error) {
      error = 'ENOBUFS';
      stopTree();
    }
  });
child.on('error', () => {
  error = 'SPAWN_FAILED';
  stopTree();
  finish(null);
});
// A parent can exit while its children keep pipes open. Kill its group on exit,
// not only after close, so pipe-holding descendants cannot strand the caller.
child.on('exit', () => stopTree());
child.on('close', (status) => finish(status));
