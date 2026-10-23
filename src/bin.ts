#!/usr/bin/env node
import path from 'node:path';
import { readFileSync, statSync } from 'node:fs';
import { readProjectProgress, updateProjectProgress, validateProgressUpdate } from './progress.js';
import { inspectProject } from './readiness.js';
import { argv } from 'node:process';
import { STANDARD_USAGE, parseStandardOptions, scaffoldStandardProject } from './standard.js';
import { GENERATOR_VERSION } from './version.js';
import { PostCommitError } from './transaction.js';

const [command, ...args] = argv.slice(2);
const json = args.includes('--json');

async function main(): Promise<void> {
  if ([undefined, '--help', '-h'].includes(command)) {
    console.log(json ? JSON.stringify({ usage: STANDARD_USAGE }) : STANDARD_USAGE);
    return;
  }
  if (['--version', '-v'].includes(command)) {
    console.log(json ? JSON.stringify({ version: GENERATOR_VERSION }) : GENERATOR_VERSION);
    return;
  }
  if (command === 'progress') {
    await runProgress(args);
    return;
  }
  if (command === 'doctor') {
    runDoctor(args);
    return;
  }
  if (command !== 'new' && command !== 'init') {
    throw new Error(`Unknown command: ${command}. Use new, init, doctor, progress, --help, or --version.`);
  }
  if (args.some((arg) => ['--help', '-h'].includes(arg))) {
    console.log(json ? JSON.stringify({ usage: STANDARD_USAGE }) : STANDARD_USAGE);
    return;
  }
  const options = readOptions(command, args);
  if (options) await scaffoldStandardProject(options);
}

async function runProgress(args: string[]): Promise<void> {
  const usage = 'Usage: anhedral progress [directory] [--update report.json] [--json]';
  let directory: string | undefined;
  let updateFile: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') continue;
    if (arg === '--update') {
      if (updateFile || !args[index + 1] || args[index + 1].startsWith('-')) throw new Error(usage);
      updateFile = args[++index];
    } else if (arg.startsWith('-') || directory) throw new Error(usage);
    else directory = arg;
  }
  const root = path.resolve(directory ?? process.cwd());
  if (updateFile && statSync(updateFile).size > 1_000_000) throw new Error('Progress update exceeds size limit');
  const result = updateFile
    ? await updateProjectProgress(root, validateProgressUpdate(JSON.parse(readFileSync(updateFile, 'utf8'))))
    : readProjectProgress(root);
  console.log(JSON.stringify(result, null, 2));
}

function runDoctor(args: string[]): void {
  const positional = args.filter((arg) => arg !== '--json');
  if (positional.length > 1 || positional.some((arg) => arg.startsWith('-'))) throw new Error('Usage: anhedral doctor [directory] [--json]');
  const report = inspectProject(path.resolve(positional[0] ?? process.cwd()));
  console.log(JSON.stringify(report, null, json ? 2 : undefined));
  if (!report.localReady) process.exitCode = 1;
}

function readOptions(command: 'new' | 'init', args: string[]) {
  try {
    return parseStandardOptions(command, args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(json ? JSON.stringify({ error: message, code: 'INVALID_ARGUMENT' }) : `Error: ${message}`);
    process.exitCode = 1;
    return;
  }
}

try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  const code = error instanceof PostCommitError ? 'POST_COMMIT_FAILED'
    : command === 'doctor' || command === 'progress' ? 'INVALID_ARGUMENT'
    : command === 'new' || command === 'init' ? 'GENERATION_FAILED' : 'UNKNOWN_COMMAND';
  console.error(json ? JSON.stringify({ error: message, code }) : `Error: ${message}`);
  process.exitCode = 1;
}
