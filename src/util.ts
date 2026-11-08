import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readBoundedFile } from './bounded-file.js';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { resolveCommand } from './process/resolve-command.js';
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
  const verbose = process.env.ANHEDRAL_VERBOSE === '1' && !quiet;
  const requested = Number(process.env.ANHEDRAL_COMMAND_OUTPUT_BYTES);
  const maximum =
    Number.isSafeInteger(requested) && requested >= 1024 && requested <= 16 * 1024 * 1024
      ? requested
      : 16 * 1024 * 1024;
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-command-'));
  const configuration = path.join(root, 'input.json'),
    resultFile = path.join(root, 'result.json');
  try {
    const bytes = JSON.stringify({
      ...invocation,
      cwd,
      timeout: commandTimeout(),
      maximum,
      verbose,
    });
    if (Buffer.byteLength(bytes) > 1024 * 1024)
      throw Error('Command configuration exceeds its bound.');
    writeFileSync(configuration, bytes, { flag: 'wx', mode: 0o600 });
    const wrapper = spawnSync(
      process.execPath,
      [fileURLToPath(new URL('./process/runner.js', import.meta.url)), configuration, resultFile],
      {
        cwd,
        shell: false,
        stdio: verbose ? 'inherit' : 'ignore',
        timeout: commandTimeout() + 10000,
        killSignal: 'SIGKILL',
      },
    );
    if (wrapper.error || wrapper.status !== 0 || !existsSync(resultFile))
      throw commandFailure(display, wrapper.status, wrapper.error);
    const result = JSON.parse(readBoundedFile(resultFile, 1024 * 1024).toString('utf8')) as {
      status: number | null;
      error?: string;
      stdout: string;
      stderr: string;
    };
    if (result.error || result.status !== 0) {
      if (!quiet && !verbose)
        for (const value of [result.stdout, result.stderr]) {
          const tail = Buffer.from(value, 'base64');
          if (tail.length) process.stderr.write(tail.subarray(-FAILURE_TAIL_BYTES));
        }
      if (result.error === 'ENOBUFS')
        throw Error(
          `Command output exceeded its capture limit: ${display}. Inspect the tool before retrying.`,
        );
      throw commandFailure(
        display,
        result.status,
        result.error
          ? Object.assign(new Error('Command execution failed'), { code: result.error })
          : undefined,
      );
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
