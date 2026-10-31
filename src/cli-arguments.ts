import { COMMANDS, commandDefinition, commandOptions, commandTopic } from './command-schema.js';

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
  let quiet = false,
    verbose = false,
    json = false,
    human = false,
    nonInteractive = false;
  let command: string | undefined;
  for (let index = 0; index < input.length; index++) {
    const arg = input[index];
    if (arg === '--') {
      args.push(...input.slice(index));
      break;
    }
    if (arg === '-c' || arg === '--cwd' || arg.startsWith('--cwd=')) {
      const value = arg.startsWith('--cwd=') ? arg.slice(6) : input[++index];
      if (!value || value.startsWith('-') || cwd !== undefined)
        throw new CliArgumentError(
          'Specify one working directory with --cwd <directory>.',
          'Run anhedral --help.',
        );
      cwd = value;
    } else if (arg === '--json') json = true;
    else if (arg === '--human') human = true;
    else if (arg === '--quiet' || arg === '-q') quiet = true;
    else if (arg === '--verbose') verbose = true;
    else if (arg === '--non-interactive') nonInteractive = true;
    else {
      args.push(arg);
      if (!command && !arg.startsWith('-')) command = arg;
      const option = commandOptions(command).find(
        (entry) => entry.flag === arg || entry.aliases?.includes(arg),
      );
      if (option?.arity && input[index + 1] !== undefined && input[index + 1] !== '--')
        args.push(input[++index]);
    }
  }
  if (json && human)
    throw new CliArgumentError('Choose --json or --human.', 'Run anhedral --help.');
  return { args, cwd, quiet, verbose, json, human, nonInteractive };
}

function definitionFor(command: string) {
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
  return definition;
}

function collectArguments(command: string, input: readonly string[]) {
  const definitions = commandOptions(command);
  const flags = definitions.flatMap((option) => [option.flag, ...(option.aliases ?? [])]);
  const positional: string[] = [];
  const options = new Map<string, string[]>();
  let literal = false;
  for (let index = 0; index < input.length; index++) {
    const argument = input[index];
    if (!literal && argument === '--') {
      literal = true;
      continue;
    }
    if (literal || !argument.startsWith('-')) {
      positional.push(argument);
      continue;
    }
    const separator = argument.indexOf('=');
    const flag = separator < 0 ? argument : argument.slice(0, separator);
    const option = definitions.find(
      (entry) => entry.flag === flag || entry.aliases?.includes(flag),
    );
    if (!option) {
      const recommendation = suggest(flag, flags);
      const display = /^--?[a-z-]{1,64}$/.test(flag) ? `: ${flag}` : '';
      throw new CliArgumentError(
        `Unknown ${command} option${display}.${recommendation ? ` Did you mean ${recommendation}?` : ''}`,
        `Run anhedral ${command} --help.`,
      );
    }
    if (options.has(option.flag) && !option.repeatable)
      throw new CliArgumentError(`Specify ${option.flag} once.`, `Run anhedral ${command} --help.`);
    if (separator >= 0 && !option.arity)
      throw new CliArgumentError(
        'This option does not accept an inline value.',
        `Run anhedral ${command} --help.`,
      );
    const values = options.get(option.flag) ?? [];
    if (option.arity) {
      const value = separator >= 0 ? argument.slice(separator + 1) : input[index + 1];
      if (!value || value.startsWith('-')) {
        if (option.arity === 'required' || separator >= 0)
          throw new CliArgumentError(
            `Supply a value for ${option.flag}.`,
            `Run anhedral ${command} --help.`,
          );
      } else {
        if (option.choices && !option.choices.includes(value))
          throw new CliArgumentError(
            `Choose ${option.choices.join(', ')} for ${option.flag}.`,
            `Run anhedral ${command} --help.`,
          );
        values.push(value);
        if (separator < 0) index++;
      }
    }
    options.set(option.flag, values);
  }
  return { positional, options };
}

export function validateCommand(command: string | undefined, args: readonly string[]): void {
  if (!command || ['--help', '-h', '--version', '-v', 'help'].includes(command)) return;
  const definition = definitionFor(command);
  const parsed = collectArguments(command, args);
  let topic = [command],
    selected = definition,
    positional = parsed.positional;
  while (selected.children) {
    const child = positional[0];
    if (!child || !Object.hasOwn(selected.children, child)) {
      const choices = Object.keys(selected.children),
        recommendation = child ? suggest(child, choices) : undefined;
      throw new CliArgumentError(
        `Choose ${topic.join(' ')} ${choices.join(', ')}.${recommendation ? ` Did you mean ${recommendation}?` : ''}`,
        `Run anhedral ${topic.join(' ')} --help.`,
      );
    }
    topic = [...topic, child];
    selected = commandTopic(topic)!;
    positional = positional.slice(1);
  }
  const shape = selected.positional;
  if (positional.length < (shape?.min ?? 0) || positional.length > (shape?.max ?? 0))
    throw new CliArgumentError(
      `Expected ${shape?.name ?? 'no extra arguments'} for ${topic.join(' ')}.`,
      `Run anhedral ${topic.join(' ')} --help.`,
    );
  if (shape?.choices && positional.some((value) => !shape.choices!.includes(value)))
    throw new CliArgumentError(
      `Choose ${shape.choices.join(', ')} for ${shape.name}.`,
      `Run anhedral ${topic.join(' ')} --help.`,
    );
  for (const group of [
    ...(definition.conflicts ?? []),
    ...(selected === definition ? [] : (selected.conflicts ?? [])),
    ['--json', '--human'],
  ]) {
    const used = group.filter((flag) => parsed.options.has(flag));
    if (used.length > 1)
      throw new CliArgumentError(
        `Choose one of ${group.join(', ')}.`,
        `Run anhedral ${topic.join(' ')} --help.`,
      );
  }
}

export function inlineArguments(command: string | undefined, args: readonly string[]): string[] {
  const flags = new Set(
    commandOptions(command)
      .filter((option) => option.arity)
      .flatMap((option) => [option.flag, ...(option.aliases ?? [])]),
  );
  const result: string[] = [];
  for (let index = 0; index < args.length; index++) {
    const argument = args[index];
    if (argument === '--') {
      result.push(...args.slice(index));
      return result;
    }
    const separator = argument.indexOf('=');
    if (separator < 0 || !flags.has(argument.slice(0, separator))) {
      result.push(argument);
      continue;
    }
    const flag = argument.slice(0, separator),
      value = argument.slice(separator + 1);
    if (!value || value.startsWith('-'))
      throw new CliArgumentError(`Supply a value for ${flag}.`, `Run anhedral ${command} --help.`);
    result.push(flag, value);
  }
  return result;
}

/** Collect validated options using the same arity and alias metadata as help. */
export function commandArguments(command: string, input: readonly string[]) {
  validateCommand(command, input);
  const { positional, options } = collectArguments(command, input);
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
