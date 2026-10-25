export interface OutputOptions {
  json?: boolean;
  quiet?: boolean;
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
  if (options.json) console.log(JSON.stringify(value, null, 2));
  else if (!options.quiet) console.log(formatResult(command, value));
}
export function printProgress(message: string, options: OutputOptions = {}): void {
  if (process.stderr.isTTY && !options.json && !options.quiet) console.error(message);
}
