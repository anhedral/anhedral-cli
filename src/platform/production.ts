import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { z } from 'zod';
import { commandArgumentError, commandArguments } from '../cli-arguments.js';
import { createReporter, type OutputOptions } from '../cli-output.js';
import {
  productionCreateReceiptSchema,
  productionCreateSchema,
  productionStateSchema,
} from '../contracts/production-transport.js';
import { platformFailure, readPrivate, withProjectLock, writePrivate } from './state.js';

type Context = { origin: string; principalId: string; projectId: string; teamId: string };
type Request = (path: string, method: string, body?: unknown) => Promise<unknown>;
const stateSchema = z
  .object({
    origin: z.string(),
    principalId: z.uuid(),
    projectId: z.uuid(),
    teamId: z.uuid(),
    input: productionCreateSchema,
    receipt: productionCreateReceiptSchema.optional(),
  })
  .strict();
const visible = (value: unknown) =>
  stripVTControlCharacters(String(value ?? '')).replace(/[\x00-\x1f\x7f]/g, ' ');

export function validateProductionArguments(args: string[]) {
  const options = commandArguments('production', args);
  const [operation] = options.positional;
  if (
    operation === 'status' &&
    ['--candidate', '--name', '--new'].some((flag) => options.has(flag))
  )
    throw commandArgumentError(
      'production',
      'Candidate, name and --new apply to production deploy only.',
    );
  if (operation === 'deploy') {
    if (!z.uuid().safeParse(options.value('--candidate')).success)
      throw commandArgumentError('production', 'Select a ready candidate UUID with --candidate.');
    if (!productionCreateSchema.shape.name.safeParse(options.value('--name')).success)
      throw commandArgumentError('production', 'Select a valid application name with --name.');
  }
  return options;
}

async function runProductionOperation(
  args: string[],
  output: OutputOptions,
  context: Context,
  request: Request,
) {
  const options = validateProductionArguments(args);
  const [operation] = options.positional;
  const reporter = createReporter(
    output,
    (value) => {
      const data = value as Record<string, unknown>;
      if (data.status === 'requested' || data.status === 'already_requested')
        return `Production deployment requested (${visible((data.deployment as { id: string }).id)}).\nRun anhedral production status to follow publication.`;
      const state = data.production as z.infer<typeof productionStateSchema>;
      return [
        `Production generation ${state.generation}.`,
        state.enabled === false
          ? 'Production deployment is not configured.'
          : `Active deployment: ${visible(state.activeDeploymentId ?? 'none')}.`,
        ...(state.requiresIndependentApproval
          ? ['This team requires an independent production approver.']
          : []),
        ...state.deployments.map(
          (entry) =>
            `${visible(entry.id)} ${visible(entry.status)} ${visible(entry.sourceRevision.slice(0, 12))}`,
        ),
      ].join('\n');
    },
    true,
  );
  const path = `/projects/${context.projectId}/production`;
  const checkedState = (value: unknown) => {
    const state = productionStateSchema.parse(value);
    if (state.deployments.some((entry) => entry.developmentId !== context.projectId))
      throw platformFailure('Production history belongs to another project.');
    return state;
  };
  if (operation === 'status') {
    reporter.result({
      status: 'read',
      environment: 'production',
      projectId: context.projectId,
      production: checkedState(await request(path, 'GET')),
    });
    return;
  }
  const candidateId = options.value('--candidate'),
    name = options.value('--name');
  const file = join(process.cwd(), '.anhedral', 'platform', 'production.json');
  const raw = await readPrivate(file),
    parsed = raw === null ? null : stateSchema.safeParse(raw);
  if (parsed && !parsed.success)
    throw platformFailure(
      'Saved production deployment state is invalid. Preserve it before retrying.',
    );
  const previous = parsed?.success ? parsed.data : null;
  if (
    previous &&
    Object.entries(context).some(([key, value]) => previous[key as keyof Context] !== value)
  )
    throw platformFailure(
      'Saved production deployment belongs to a different identity, team or project. Restore its original context.',
    );
  if (
    previous &&
    !options.has('--new') &&
    (previous.input.candidateId !== candidateId || previous.input.name !== name)
  )
    throw platformFailure(
      'The candidate or name differs from the pending production deployment. Use --new for another deployment.',
    );
  const validReceipt = (
    receipt: z.infer<typeof productionCreateReceiptSchema>,
    input: z.infer<typeof productionCreateSchema>,
  ) =>
    receipt.developmentId === context.projectId &&
    receipt.requestId === input.requestId &&
    receipt.candidateId === input.candidateId &&
    receipt.generation === input.expectedGeneration + 1;
  if (previous?.receipt && !validReceipt(previous.receipt, previous.input))
    throw platformFailure(
      'Saved production receipt differs from its request. Preserve state and reconcile before retrying.',
    );
  if (previous?.receipt && !options.has('--new')) {
    reporter.result({
      status: 'already_requested',
      environment: 'production',
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
    if (current.requiresIndependentApproval)
      throw platformFailure(
        'This team requires an independent production approver. Request approval in Platform before production publication.',
        'Review the team production approval policy in Platform.',
        'permission',
      );
    if (current.enabled !== true || !current.canDeploy)
      throw platformFailure(
        'Production deployment is not configured or current production permission is unavailable.',
      );
    state = {
      ...context,
      input: productionCreateSchema.parse({
        requestId: randomUUID(),
        candidateId,
        name,
        expectedGeneration: current.generation,
      }),
    };
    await writePrivate(file, state);
  }
  const receipt = productionCreateReceiptSchema.parse(
    await request(`${path}/deployments`, 'POST', state.input),
  );
  if (!validReceipt(receipt, state.input))
    throw platformFailure(
      'Production receipt differs from this request. Preserve saved state before retrying.',
    );
  await writePrivate(file, { ...state, receipt });
  reporter.result({
    status: 'requested',
    environment: 'production',
    projectId: context.projectId,
    requestId: state.input.requestId,
    deployment: receipt,
  });
}

export async function runProductionCommand(
  args: string[],
  output: OutputOptions,
  context: Context,
  request: Request,
) {
  const options = validateProductionArguments(args);
  if (options.positional[0] === 'deploy')
    return withProjectLock(join(process.cwd(), '.anhedral', 'platform'), () =>
      runProductionOperation(args, output, context, request),
    );
  return runProductionOperation(args, output, context, request);
}
