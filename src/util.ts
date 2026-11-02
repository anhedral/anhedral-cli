import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolveCommand } from './command.js';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const FAILURE_TAIL_BYTES = 128 * 1024;

function commandTimeout(): number {
  const value = Number(process.env.ANHEDRAL_COMMAND_TIMEOUT_MS);
  return Number.isSafeInteger(value) && value >= 1 && value <= 20 * 60 * 1000
    ? value
    : 20 * 60 * 1000;
}

function commandFailure(cmd: string, status: number | null, error?: Error): Error {
  const timedOut = (error as NodeJS.ErrnoException | undefined)?.code === 'ETIMEDOUT';
  return new Error(
    timedOut
      ? `Command timed out: ${cmd}. Check connectivity and local tooling before retrying.`
      : `Command failed (exit ${status ?? '?'}): ${cmd}`,
    error ? { cause: error } : undefined,
  );
}

export function writeFile(filePath: string, content: string): void {
  const existed = existsSync(filePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, { encoding: 'utf8', mode: 0o644 });
  // Defeat a restrictive caller umask for newly generated files. Existing seeded
  // files retain their user-selected mode across structural merges.
  if (!existed) chmodSync(filePath, 0o644);
}

export function appendGitignore(root: string, lines: string[]): void {
  const filePath = path.join(root, '.gitignore');
  const existing = existsSync(filePath) ? readFileSync(filePath, 'utf-8') : '';
  const existingLines = new Set(existing.split(/\r\n|\n|\r/));
  const additions = [...new Set(lines)].filter((line) => !existingLines.has(line));
  if (additions.length === 0) return;

  const newline = existing.includes('\r\n')
    ? '\r\n'
    : existing.includes('\n')
      ? '\n'
      : existing.includes('\r')
        ? '\r'
        : '\n';
  const separator = existing.length > 0 && !/(?:\r\n|\n|\r)$/.test(existing) ? newline : '';
  writeFile(filePath, `${existing}${separator}${additions.join(newline)}${newline}`);
}

export function execFile(executable: string, args: readonly string[], cwd: string): void {
  const invocation = resolveCommand(executable, args);
  const quiet = process.env.ANHEDRAL_QUIET === '1';
  const display = [executable, ...args].join(' ');
  const deadline = { timeout: commandTimeout(), killSignal: 'SIGKILL' as const };
  if (process.env.ANHEDRAL_VERBOSE === '1' && !quiet) {
    console.log(`  $ ${display}`);
    const result = spawnSync(invocation.command, invocation.args, {
      cwd,
      stdio: 'inherit',
      shell: false,
      ...deadline,
    });
    if (result.error || result.status !== 0) {
      throw commandFailure(display, result.status, result.error);
    }
    return;
  }

  const requested = Number(process.env.ANHEDRAL_COMMAND_OUTPUT_BYTES);
  const maximum =
    Number.isSafeInteger(requested) && requested >= 1024 && requested <= 16 * 1024 * 1024
      ? requested
      : 16 * 1024 * 1024;
  const result = spawnSync(invocation.command, invocation.args, {
    cwd,
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: maximum,
    ...deadline,
  });
  if (result.error || result.status !== 0) {
    if (!quiet)
      for (const bytes of [result.stdout, result.stderr])
        if (bytes?.length) process.stderr.write(bytes.subarray(-FAILURE_TAIL_BYTES));
    if ((result.error as NodeJS.ErrnoException | undefined)?.code === 'ENOBUFS')
      throw Error(
        `Command output exceeded its capture limit: ${display}. Inspect the tool before retrying.`,
      );
    throw commandFailure(display, result.status, result.error);
  }
}
