import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { addStackItems } from './add.js';
import { buildSourceRegistry, loadSourceRegistry } from './remote.js';
import { STACK_REGISTRY, getStackItem } from '../stack-registry.js';
export async function runRegistry(args: string[], json: boolean): Promise<void> {
  if (args[0] === 'build') {
    args = args.filter((arg) => arg !== '--json');
    if (args.length !== 4 || args[2] !== '--output' || !args[1] || !args[3])
      throw new Error('Use registry build <manifest> --output <registry.json>.');
    const source = path.resolve(args[1]);
    const output = path.resolve(args[3]);
    if (source === output)
      throw new Error('Registry output must differ from its authored manifest.');
    const registry = buildSourceRegistry(source);
    mkdirSync(path.dirname(output), { recursive: true });
    writeFileSync(output, JSON.stringify(registry, null, 2) + '\n');
    console.log(JSON.stringify({ output, items: registry.items.length }));
    return;
  }
  const registryFlag = args.indexOf('--registry');
  if (registryFlag >= 0) {
    const source = args[registryFlag + 1];
    if (!source || source.startsWith('-')) throw new Error('Missing registry source.');
    const positional = args.filter(
      (arg, index) => index !== registryFlag && index !== registryFlag + 1 && arg !== '--json',
    );
    const registry = await loadSourceRegistry(source);
    if (positional.length === 1 && positional[0] === 'list')
      console.log(JSON.stringify(registry, null, 2));
    else if (positional.length === 2 && positional[0] === 'view') {
      const item = registry.registry.items.find((item) => item.name === positional[1]);
      if (!item) throw new Error('Unknown remote registry item.');
      console.log(
        JSON.stringify({ source: registry.source, integrity: registry.integrity, item }, null, 2),
      );
    } else throw new Error('Use registry list|view [item] --registry <file|https-url>.');
    return;
  }
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
    console.log(
      'anhedral add <directory> <items...> [--registry <file|https-url>] [--integrity sha256-...] [--dry-run] [--skip-install] [--json]',
    );
    return;
  }
  let source: string | undefined;
  let integrity: string | undefined;
  const positional: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (['--dry-run', '--skip-install', '--json'].includes(arg)) continue;
    if (arg === '--integrity') {
      if (integrity || !args[index + 1] || !/^sha256-[A-Za-z0-9+/]{43}=$/.test(args[index + 1]!))
        throw new Error('Specify one SHA-256 registry integrity.');
      integrity = args[++index];
    } else if (arg === '--registry') {
      if (source || !args[index + 1] || args[index + 1]!.startsWith('-'))
        throw new Error('Specify one registry source.');
      source = args[++index];
    } else if (arg.startsWith('-')) throw new Error('Unknown add option.');
    else positional.push(arg);
  }
  const [directory, ...items] = positional;
  if (!directory || !items.length) throw new Error('Use add <directory> <items...>.');
  console.log(
    JSON.stringify(
      await addStackItems(path.resolve(directory), {
        items,
        registry: source,
        integrity,
        dryRun: args.includes('--dry-run'),
        skipInstall: args.includes('--skip-install'),
      }),
      null,
      2,
    ),
  );
}
