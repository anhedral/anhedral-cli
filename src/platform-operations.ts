import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { z } from 'zod';
import { commandArguments, commandArgumentError } from './cli-arguments.js';
import { createReporter, type OutputOptions } from './cli-output.js';
import {
  stagingCreateSchema,
  stagingStateSchema,
  stagingCreateReceiptSchema,
} from './contracts/staging-transport.js';
import { runtimeLogQuerySchema, runtimeLogPageSchema } from './contracts/runtime-logs-transport.js';
import { platformFailure, readPrivate, writePrivate } from './platform-state.js';

type Context = { origin: string; principalId: string; projectId: string; teamId: string };
type Request = (path: string, method: string, body?: unknown) => Promise<unknown>;
const contextSchema = z.object({
  origin: z.string(),
  principalId: z.uuid(),
  projectId: z.uuid(),
  teamId: z.uuid(),
});
const receiptSchema = stagingCreateReceiptSchema;
const stateSchema = contextSchema
  .extend({ input: stagingCreateSchema, receipt: receiptSchema.optional() })
  .strict();
const visible = (value: unknown) =>
  stripVTControlCharacters(String(value ?? '')).replace(/[\x00-\x1f\x7f]/g, ' ');

export function validateStagingArguments(args: string[]) {
  const options = commandArguments('staging', args);
  const [operation] = options.positional;
  if (operation === 'status' && (options.has('--candidate') || options.has('--new')))
    throw commandArgumentError('staging', 'Candidate and --new apply to staging deploy only.');
  if (operation === 'deploy' && !z.uuid().safeParse(options.value('--candidate')).success)
    throw commandArgumentError('staging', 'Select a ready candidate UUID with --candidate.');
  return options;
}
export function validateLogsArguments(args: string[]) {
  const options = commandArguments('logs', args);
  const parsed = runtimeLogQuerySchema.safeParse({
    environment: options.value('--environment') ?? 'staging',
    deploymentId: options.value('--deployment'),
    level: options.value('--level'),
    source: options.value('--source'),
    range: options.value('--range'),
    search: options.value('--search'),
    cursor: options.value('--cursor'),
  });
  if (!parsed.success)
    throw commandArgumentError(
      'logs',
      'Check the environment, deployment, level, source, range and cursor filters.',
    );
  return parsed.data;
}

export async function runStagingCommand(
  args: string[],
  output: OutputOptions,
  context: Context,
  request: Request,
) {
  const options = validateStagingArguments(args);
  const [operation] = options.positional;
  const reporter = createReporter(
    output,
    (value) => {
      const data = value as Record<string, unknown>;
      if (data.status === 'requested' || data.status === 'already_requested')
        return `Staging deployment requested (${visible((data.deployment as { id: string }).id)}).\nRun anhedral staging status to follow preparation.`;
      const state = data.staging as z.infer<typeof stagingStateSchema>;
      return [
        `Staging generation ${state.generation}.`,
        state.enabled === false
          ? 'Persistent staging is not configured.'
          : `Active deployment: ${visible(state.activeDeploymentId ?? 'none')}.`,
        ...state.deployments.map(
          (entry) => `${entry.id} ${entry.status} ${entry.sourceRevision.slice(0, 12)}`,
        ),
      ].join('\n');
    },
    true,
  );
  const path = `/projects/${context.projectId}/staging`;
  const checkedState = (value: unknown) => {
    const state = stagingStateSchema.parse(value);
    if (state.deployments.some((entry) => entry.developmentId !== context.projectId))
      throw platformFailure('Staging history belongs to another project.');
    return state;
  };
  if (operation === 'status') {
    reporter.result({
      status: 'read',
      environment: 'staging',
      projectId: context.projectId,
      staging: checkedState(await request(path, 'GET')),
    });
    return;
  }
  const candidateId = options.value('--candidate');
  const file = join(process.cwd(), '.anhedral', 'platform', 'staging.json');
  const raw = await readPrivate(file);
  const parsed = raw === null ? null : stateSchema.safeParse(raw);
  if (parsed && !parsed.success)
    throw platformFailure(
      'Saved staging deployment state is invalid. Preserve it before retrying.',
    );
  const previous = parsed?.success ? parsed.data : null;
  if (
    previous &&
    Object.entries(context).some(([key, value]) => previous[key as keyof Context] !== value)
  )
    throw platformFailure(
      'Saved staging deployment belongs to a different identity, team or project. Restore its original context.',
    );
  if (previous && !options.has('--new') && previous.input.candidateId !== candidateId)
    throw platformFailure(
      'The candidate differs from the pending staging deployment. Use --new for another deployment.',
    );
  if (
    previous?.receipt &&
    (previous.receipt.developmentId !== context.projectId ||
      previous.receipt.requestId !== previous.input.requestId ||
      previous.receipt.candidateId !== previous.input.candidateId ||
      previous.receipt.generation !== previous.input.expectedGeneration + 1)
  )
    throw platformFailure(
      'Saved staging receipt differs from its request. Preserve state and reconcile before retrying.',
    );
  if (previous?.receipt && !options.has('--new')) {
    reporter.result({
      status: 'already_requested',
      environment: 'staging',
      projectId: context.projectId,
      requestId: previous.input.requestId,
      deployment: previous.receipt,
    });
    return;
  }
  let state: z.infer<typeof stateSchema>;
  if (previous && !options.has('--new')) state = previous;
  else {
    const current = checkedState(await request(path, 'GET'));
    if (current.enabled !== true || !current.canDeploy)
      throw platformFailure(
        'Staging deployment is not configured or current build permission is unavailable.',
      );
    state = {
      ...context,
      input: stagingCreateSchema.parse({
        requestId: randomUUID(),
        candidateId,
        expectedGeneration: current.generation,
      }),
    };
    await writePrivate(file, state);
  }
  const receipt = receiptSchema.parse(await request(`${path}/deployments`, 'POST', state.input));
  if (
    receipt.developmentId !== context.projectId ||
    receipt.requestId !== state.input.requestId ||
    receipt.candidateId !== state.input.candidateId ||
    receipt.generation !== state.input.expectedGeneration + 1
  )
    throw platformFailure(
      'Staging receipt differs from this request. Preserve saved state before retrying.',
    );
  await writePrivate(file, { ...state, receipt });
  reporter.result({
    status: 'requested',
    environment: 'staging',
    projectId: context.projectId,
    requestId: state.input.requestId,
    deployment: receipt,
  });
}

export async function runLogsCommand(
  args: string[],
  output: OutputOptions,
  context: Context,
  request: Request,
) {
  const query = validateLogsArguments(args);
  const params = new URLSearchParams(
    Object.entries(query).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
  const page = runtimeLogPageSchema.parse(
    await request(`/projects/${context.projectId}/runtime-logs?${params}`, 'GET'),
  );
  if (
    page.environment !== query.environment ||
    page.entries.some(
      (entry) =>
        entry.environment !== query.environment ||
        (query.deploymentId && entry.deploymentId !== query.deploymentId),
    )
  )
    throw platformFailure(
      'Runtime log response differs from the selected environment or deployment.',
    );
  const reporter = createReporter(
    output,
    (value) => {
      const logs = (value as { logs: typeof page }).logs;
      return [
        logs.state === 'ready' ? `Runtime logs: ${logs.environment}.` : visible(logs.reason),
        ...logs.entries.map(
          (entry) =>
            `${entry.occurredAt} ${entry.level} ${entry.component}/${entry.kind} ${visible(entry.message)}`,
        ),
        ...(logs.nextCursor ? [`More entries: use --cursor ${logs.nextCursor}.`] : []),
        ...(logs.dropped ? [`${logs.dropped} entries were dropped by collection limits.`] : []),
      ].join('\n');
    },
    true,
  );
  reporter.result({ projectId: context.projectId, logs: page });
}
