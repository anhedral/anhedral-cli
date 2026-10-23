import { CAPABILITY_CONTRACT, formatCapabilityContract } from '../capability-contract.js';
import { addStackItems } from './add.js';
import { STACK_REGISTRY, STANDARD_PRODUCTS, getStackItem } from '../stack-registry.js';
import { printResult, type OutputOptions } from '../cli-output.js';
import { commandHelp } from './usage.js';
import { CliArgumentError, suggest, commandArguments } from '../cli-arguments.js';
export async function runRegistry(
  args: string[],
  json: boolean,
  output: OutputOptions = { json },
): Promise<void> {
  const parsed = commandArguments('registry', args);
  if (parsed.has('--help')) {
    console.log(commandHelp('registry'));
    return;
  }
  const [action = 'list', name, ...extra] = parsed.positional;
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
  const items = positional;
  if (!items.length)
    throw new Error('Select payments: anhedral add stripe revenuecat [--cwd <directory>].');
  for (const item of items) {
    if (['stripe', 'revenuecat'].includes(item)) continue;
    const correction = suggest(item, ['stripe', 'revenuecat']);
    throw new CliArgumentError(
      `Unknown stack part.${correction ? ` Did you mean ${correction}?` : ''}`,
      'Select a project with --cwd <directory>; optional additions are stripe and revenuecat.',
    );
  }
  printResult(
    'add',
    await addStackItems(process.cwd(), {
      items,
      dryRun: args.includes('--dry-run') || Boolean(preview),
      skipInstall: args.includes('--skip-install'),
      ...(preview ? { preview } : {}),
    }),
    { ...output, json: args.includes('--json') },
  );
}
