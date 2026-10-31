export interface CliIO {
  out: { write(text: string): unknown };
  err: { write(text: string): unknown };
  stdinTTY: boolean;
  stdoutTTY: boolean;
  stderrTTY: boolean;
  ci?: boolean;
}
export interface OutputOptions {
  json?: boolean;
  quiet?: boolean;
  human?: boolean;
  nonInteractive?: boolean;
  io?: CliIO;
}

/** One output policy for terminal, redirected, and machine consumers. */
export function createReporter(
  options: OutputOptions = {},
  humanFormatter: (value: unknown) => string = (value) => String(value),
  defaultJson = false,
) {
  const json = options.json || (defaultJson && !options.human);
  const ci =
    options.io?.ci ?? !!(process.env.CI && process.env.CI !== '0' && process.env.CI !== 'false');
  const line = (stream: 'out' | 'err', value: string) => {
    if (options.io) options.io[stream].write(value + '\n');
    else if (stream === 'out') console.log(value);
    else console.error(value);
  };
  return {
    canPrompt:
      !options.json &&
      !options.quiet &&
      !options.nonInteractive &&
      !ci &&
      (options.io?.stdinTTY ?? !!process.stdin.isTTY) &&
      (options.io?.stdoutTTY ?? !!process.stdout.isTTY),
    result(value: unknown): void {
      // Quiet suppresses implicit output, while explicitly requested JSON survives.
      if (options.quiet && !options.json) return;
      line(
        'out',
        json ? JSON.stringify(value, null, defaultJson ? undefined : 2) : humanFormatter(value),
      );
    },
    diagnostic(message: string): void {
      if (!options.json && !options.quiet) line('err', message);
    },
    progress(message: string): void {
      if (!json && !options.quiet && (options.io?.stderrTTY ?? !!process.stderr.isTTY))
        line('err', message);
    },
  };
}

export function formatResult(_command: string, value: unknown): string {
  const data = value as { generated?: boolean; root: string; products: string[] };
  return (
    `${data.generated ? 'Created' : 'Foundation preview for'} ${data.root}.\nStack: ${data.products.join(', ')}.\n` +
    (data.generated
      ? 'Review README.md, then run pnpm dev in the project directory. You own development, integrations and hosting.'
      : 'No files were written or resources provisioned.')
  );
}
export function printResult(command: string, value: unknown, options: OutputOptions = {}): void {
  createReporter(options, (data) => formatResult(command, data)).result(value);
}
export function printProgress(message: string, options: OutputOptions = {}): void {
  createReporter(options).progress(message);
}
