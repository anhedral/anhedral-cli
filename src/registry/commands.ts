import path from 'node:path';
import { addStackItems } from './add.js';
import { STACK_REGISTRY, getStackItem } from '../stack-registry.js';
export async function runRegistry(args: string[], json: boolean): Promise<void> {
  const positional = args.filter((arg) => arg !== '--json');
  if (positional.includes('--help') || positional.includes('-h')) {
    console.log('anhedral registry list|view [item] [--json]');
    return;
  }
  if (positional.some((arg) => arg.startsWith('-'))) throw new Error('Unknown registry option.');
  const [action = 'list', name, ...extra] = positional;
  if (action === 'list' && !name && !extra.length) {
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
    console.log(JSON.stringify(getStackItem(name), null, 2));
    return;
  }
  throw new Error('Use registry list or registry view <item>.');
}
export async function runAdd(args: string[]): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    console.log('anhedral add <directory> <items...> [--dry-run] [--skip-install] [--json]');
    return;
  }
  const positional: string[] = [];
  for (const arg of args) {
    if (['--dry-run', '--skip-install', '--json'].includes(arg)) continue;
    if (arg.startsWith('-')) throw new Error(`Unknown add option: ${arg}.`);
    positional.push(arg);
  }
  const [directory, ...items] = positional;
  if (!directory || !items.length) throw new Error('Use add <directory> <items...>.');
  console.log(
    JSON.stringify(
      await addStackItems(path.resolve(directory), {
        items,
        dryRun: args.includes('--dry-run'),
        skipInstall: args.includes('--skip-install'),
      }),
      null,
      2,
    ),
  );
}
