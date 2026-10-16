import { COMMANDS, GLOBAL_OPTIONS, commandDefinition } from './command-schema.js';

export class CliArgumentError extends Error {
  constructor(
    message: string,
    readonly nextAction: string,
    readonly code = 'INVALID_ARGUMENT',
  ) {
    super(message);
  }
}

/** Bound typo matching so arbitrary CLI input cannot create quadratic work. */
export function suggest(input: string, choices: readonly string[]): string | undefined {
  if (!input || input.length > 64) return undefined;
  const distance = (a: string, b: string): number => {
    let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let row = 1; row <= a.length; row++) {
      const current = [row];
      for (let column = 1; column <= b.length; column++)
        current[column] = Math.min(
          current[column - 1] + 1,
          previous[column] + 1,
          previous[column - 1] + (a[row - 1] === b[column - 1] ? 0 : 1),
        );
      previous = current;
    }
    return previous[b.length];
  };
  const matches = choices
    .map((choice) => ({ choice, distance: distance(input, choice) }))
    .sort((a, b) => a.distance - b.distance || a.choice.localeCompare(b.choice));
  const best = matches[0];
  if (
    best &&
    best.distance <= (input.length > 5 ? 2 : 1) &&
    (!matches[1] || best.distance < matches[1].distance)
  )
    return best.choice;
  return undefined;
}

export function globalArguments(input: readonly string[]) {
  const args: string[] = [];
  let cwd: string | undefined;
  let quiet = false;
  let verbose = false;
  let json = false;
  for (let index = 0; index < input.length; index++) {
    const arg = input[index];
    if (arg === '-c' || arg === '--cwd' || arg.startsWith('--cwd=')) {
      const value = arg.startsWith('--cwd=') ? arg.slice(6) : input[++index];
      if (!value || value.startsWith('-') || cwd !== undefined)
        throw new CliArgumentError(
          'Specify one working directory with --cwd <directory>.',
          'Run anhedral --help.',
        );
      cwd = value;
    } else if (arg === '--json') json = true;
    else if (arg === '--quiet' || arg === '-q') quiet = true;
    else if (arg === '--verbose') verbose = true;
    else args.push(arg);
  }
  return { args, cwd, quiet, verbose, json };
}

export function validateCommand(command: string | undefined, args: readonly string[]): void {
  if (!command || ['--help', '-h', '--version', '-v', 'help'].includes(command)) return;
  const definition = commandDefinition(command);
  if (!definition) {
    const recommendation = suggest(command, [...Object.keys(COMMANDS), 'help']);
    const name = /^[a-z-]{1,32}$/.test(command) ? `: ${command}` : '';
    throw new CliArgumentError(
      `Unknown command${name}.${recommendation ? ` Did you mean ${recommendation}?` : ''}`,
      'Run anhedral --help.',
      'UNKNOWN_COMMAND',
    );
  }
  const options = [...definition.options, ...GLOBAL_OPTIONS];
  const flags = options.flatMap((option) => [option.flag, ...(option.aliases ?? [])]);
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (!argument.startsWith('-')) continue;
    const separator = argument.indexOf('=');
    const flag = separator < 0 ? argument : argument.slice(0, separator);
    const option = options.find((entry) => entry.flag === flag || entry.aliases?.includes(flag));
    if (!option) {
      const recommendation = suggest(flag, flags);
      const display = /^--?[a-z-]{1,64}$/.test(flag) ? `: ${flag}` : '';
      throw new CliArgumentError(
        `Unknown ${command} option${display}.${recommendation ? ` Did you mean ${recommendation}?` : ''}`,
        `Run anhedral ${command} --help.`,
      );
    }
    if (seen.has(option.flag) && !option.repeatable)
      throw new CliArgumentError(`Specify ${option.flag} once.`, `Run anhedral ${command} --help.`);
    seen.add(option.flag);
    if (separator >= 0 && !option.arity)
      throw new CliArgumentError(
        'This option does not accept an inline value.',
        `Run anhedral ${command} --help.`,
      );
    if (option.arity) {
      const value = separator >= 0 ? argument.slice(separator + 1) : args[index + 1];
      if (!value || value.startsWith('-')) {
        if (option.arity === 'required' || separator >= 0)
          throw new CliArgumentError(
            `Supply a value for ${option.flag}.`,
            `Run anhedral ${command} --help.`,
          );
      } else if (separator < 0) index++;
    }
  }
}

export function inlineArguments(command: string | undefined, args: readonly string[]): string[] {
  const definition = commandDefinition(command);
  const flags = new Set(
    definition?.options
      .filter((option) => option.arity)
      .flatMap((option) => [option.flag, ...(option.aliases ?? [])]) ?? [],
  );
  return args.flatMap((argument) => {
    const separator = argument.indexOf('=');
    if (separator < 0 || !flags.has(argument.slice(0, separator))) return [argument];
    const flag = argument.slice(0, separator);
    const value = argument.slice(separator + 1);
    if (!value || value.startsWith('-'))
      throw new CliArgumentError(`Supply a value for ${flag}.`, `Run anhedral ${command} --help.`);
    return [flag, value];
  });
}

/** Collect validated options using the same arity and alias metadata as help. */
export function commandArguments(command: string, input: readonly string[]) {
  validateCommand(command, input);
  const args = inlineArguments(command, input);
  const definitions = [...(commandDefinition(command)?.options ?? []), ...GLOBAL_OPTIONS];
  const positional: string[] = [];
  const options = new Map<string, string[]>();
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    const option = definitions.find(
      (entry) => entry.flag === argument || entry.aliases?.includes(argument),
    );
    if (!option) {
      positional.push(argument);
      continue;
    }
    const values = options.get(option.flag) ?? [];
    const next = args[index + 1];
    if (option.arity && next && !next.startsWith('-')) {
      values.push(next);
      index++;
    }
    options.set(option.flag, values);
  }
  return {
    positional,
    has: (flag: string) => options.has(flag),
    value: (flag: string) => options.get(flag)?.[0],
    values: (flag: string) => [...(options.get(flag) ?? [])],
  };
}

export function commandArgumentError(command: string, message: string): CliArgumentError {
  return new CliArgumentError(message, `Run anhedral ${command} --help.`);
}
