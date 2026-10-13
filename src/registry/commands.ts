import path from 'node:path';
import { CAPABILITY_CONTRACT, formatCapabilityContract } from '../capability-contract.js';
import { addStackItems } from './add.js';
import { STACK_REGISTRY, STANDARD_PRODUCTS, getStackItem } from '../stack-registry.js';
import { printResult, type OutputOptions } from '../cli-output.js';
import { commandHelp } from './usage.js';
import { CliArgumentError, suggest } from '../cli-arguments.js';
export async function runRegistry(
  args: string[],
  json: boolean,
  output: OutputOptions = { json },
): Promise<void> {
  const positional = args.filter((arg) => arg !== '--json');
  if (positional.includes('--help') || positional.includes('-h')) {
    console.log(commandHelp('registry'));
    return;
  }
  if (positional.some((arg) => arg.startsWith('-'))) throw new Error('Unknown registry option.');
  const [action = 'list', name, ...extra] = positional;
  if (action === 'capabilities' && !name && !extra.length) {
    if (output.quiet && !json) return;
    console.log(json ? JSON.stringify(CAPABILITY_CONTRACT, null, 2) : formatCapabilityContract());
    return;
  }
  if (action === 'list' && !name && !extra.length) {
    if (output.quiet && !json) return;
    console.log(
      json
        ? JSON.stringify(STACK_REGISTRY, null, 2)
        : STACK_REGISTRY.items
            .map((item) => `${item.name} (${item.type}) — ${item.description}`)
            .join('\n'),
    );
    return;
  }
  if (action === 'view' && name && !extra.length) {
    if (!STACK_REGISTRY.items.some((item) => item.name === name)) {
      const correction = suggest(
        name,
        STACK_REGISTRY.items.map((item) => item.name),
      );
      throw new CliArgumentError(
        `Unknown bundled registry item.${correction ? ` Did you mean ${correction}?` : ''}`,
        'Run anhedral registry list.',
      );
    }
    printResult('registry', getStackItem(name), { ...output, json });
    return;
  }
  throw new Error('Use registry list, registry view <item>, or registry capabilities.');
}
export async function runAdd(args: string[], output: OutputOptions = {}): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(commandHelp('add'));
    return;
  }
  const positional: string[] = [];
  let preview: { mode: 'diff' | 'view'; path?: string } | undefined;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === '--diff' || arg === '--view') {
      if (preview) throw new Error('Select one source preview: --diff or --view.');
      preview = { mode: arg === '--diff' ? 'diff' : 'view' };
      const next = args[index + 1];
      if (
        next &&
        !next.startsWith('-') &&
        !(STANDARD_PRODUCTS as readonly string[]).includes(next)
      ) {
        preview.path = next;
        index++;
      }
      continue;
    }
    if (['--dry-run', '--skip-install', '--json'].includes(arg)) continue;
    if (arg.startsWith('-')) throw new Error(`Unknown add option: ${arg}.`);
    positional.push(arg);
  }
  const hasDirectory =
    positional[0] && !(STANDARD_PRODUCTS as readonly string[]).includes(positional[0]);
  if (hasDirectory && positional.length === 1) {
    const correction = suggest(positional[0], STANDARD_PRODUCTS);
    if (correction)
      throw new CliArgumentError(
        `Unknown stack part. Did you mean ${correction}?`,
        'Run anhedral registry list.',
      );
  }
  const directory = hasDirectory ? positional.shift()! : process.cwd();
  const items = positional;
  if (!items.length)
    throw new Error('Select bundled parts: anhedral add <items...> [--cwd <directory>].');
  printResult(
    'add',
    await addStackItems(path.resolve(directory), {
      items,
      dryRun: args.includes('--dry-run') || Boolean(preview),
      skipInstall: args.includes('--skip-install'),
      ...(preview ? { preview } : {}),
    }),
    { ...output, json: args.includes('--json') },
  );
}
