import { commandArguments } from '../cli-arguments.js';
import { createReporter, type OutputOptions } from '../cli-output.js';
import { inspectMobileProject } from './doctor.js';

export function runMobileCommand(args: string[], output: OutputOptions) {
  const parsed = commandArguments('mobile', args);
  const report = inspectMobileProject(process.cwd(), parsed.value('--app-dir'));
  createReporter(output, () =>
    [
      `Mobile source: ${report.status}`,
      ...report.checks.map((check) => `${check.status}\t${check.id}: ${check.message}`),
      'No project code was executed. Native runtime and hosted admission are not verified.',
    ].join('\n'),
  ).result(report);
  if (report.status !== 'source-ready') process.exitCode = 1;
}
