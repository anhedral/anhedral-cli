#!/usr/bin/env node
import { registerSession } from './session-commands.js';
import { registerApi } from './api-commands.js';
import { createRequire } from 'node:module';
import { Command } from 'commander';

const metadata = createRequire(import.meta.url)('../package.json');
const program = new Command()
  .name(Object.keys(metadata.bin)[0]!)
  .version(metadata.version)
  .description('Command-line interface for ' + Object.keys(metadata.bin)[0]);
registerApi(program);
registerSession(program);
if (process.argv.length === 2) program.outputHelp();
else await program.parseAsync();
