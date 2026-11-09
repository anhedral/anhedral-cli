import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { commandArgumentError } from '../cli-arguments.js';
import {
  canonicalCliJson,
  cliPlanInputSchema,
  cliPlanSchema,
  cliPreparationSchema,
  sourceUploadReceiptSchema,
} from '../contracts/cli-transport.js';
import { deploymentManifestSchema } from '../contracts/deployment.js';
import { visible } from './output.js';
import { uploadState } from './state-schema.js';
import { readPrivate, writePrivate } from './state.js';
import type { SourceOperation } from './types.js';
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export async function runDeploy({
  options,
  origin,
  actor,
  token,
  stateDir,
  link,
  uploadPath,
  request,
  emit,
  platformFailure,
}: SourceOperation) {
  const command = 'deploy';
  const localPath = join(stateDir, 'deployment.json');
  const stateSchema = z
    .object({
      origin: z.string(),
      principalId: z.uuid(),
      projectId: z.uuid(),
      planInput: cliPlanInputSchema,
      plan: cliPlanSchema.optional(),
      prepareRequestId: z.uuid().optional(),
      candidateId: z.uuid().optional(),
    })
    .strict();
  const stored = stateSchema.safeParse(await readPrivate(localPath));
  const state =
    stored.success &&
    stored.data.origin === origin &&
    stored.data.principalId === actor.principalId &&
    stored.data.projectId === link.projectId
      ? stored.data
      : null;
  const persist = (v: z.infer<typeof stateSchema>) => writePrivate(localPath, v);
  const checkedPlan = (
    plan: z.infer<typeof cliPlanSchema>,
    input: z.infer<typeof cliPlanInputSchema>,
  ) => {
    const { digest, ...unsigned } = plan;
    if (
      hash(new TextEncoder().encode(canonicalCliJson(unsigned))) !== digest ||
      plan.projectId !== link.projectId ||
      plan.uploadId !== input.uploadId ||
      plan.requestId !== input.requestId ||
      canonicalCliJson(plan.manifest) !== canonicalCliJson(input.manifest)
    )
      throw platformFailure('Deployment plan identity or integrity differs.');
    return plan;
  };
  if (state?.plan) checkedPlan(state.plan, state.planInput);

  if (options.positional[0] === 'plan') {
    const upload = uploadState.parse(await readPrivate(uploadPath));
    if (
      upload.origin !== origin ||
      upload.principalId !== actor.principalId ||
      upload.input.projectId !== link.projectId ||
      !upload.uploadId
    )
      throw platformFailure('Choose a sealed upload for this linked identity.');
    const receipt = sourceUploadReceiptSchema.parse(
      await request(`/uploads/${upload.uploadId}`, 'GET', undefined, token, link.teamId),
    );
    if (
      receipt.state !== 'sealed' ||
      receipt.sourceRevision !== upload.input.archiveDigest ||
      receipt.projectId !== link.projectId
    )
      throw platformFailure('The saved source upload is not sealed.');
    const file = options.value('--manifest');
    if (!file) throw commandArgumentError(command, 'Use deploy plan --manifest <file>.');
    const handle = await import('node:fs/promises').then((fs) =>
      fs.open(resolve(file), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK),
    );
    let manifest: unknown;
    try {
      const info = await handle.stat();
      if (!info.isFile() || info.size > 32768)
        throw platformFailure('Deployment manifest exceeds its limit.');
      try {
        manifest = JSON.parse(await handle.readFile('utf8'));
      } catch {
        throw commandArgumentError(
          command,
          'The deployment manifest is not valid JSON. Review it before retrying.',
        );
      }
    } finally {
      await handle.close();
    }
    const checkedManifest = deploymentManifestSchema.safeParse(manifest);
    if (!checkedManifest.success)
      throw commandArgumentError(
        command,
        'The deployment manifest must match its foundation, capabilities, identity and runtime profile. TanStack Start uses the anhedral-stack runtime profile.',
      );
    const compared = cliPlanInputSchema.parse({
      protocol: 1,
      requestId: state && !options.has('--new') ? state.planInput.requestId : randomUUID(),
      uploadId: upload.uploadId,
      manifest: checkedManifest.data,
    });
    if (
      state &&
      !options.has('--new') &&
      canonicalCliJson(state.planInput) !== canonicalCliJson(compared)
    )
      throw platformFailure('Plan inputs changed. Use deploy plan --new to create a new request.');
    const local = {
      origin,
      principalId: actor.principalId,
      projectId: link.projectId,
      planInput: compared,
    };
    // Persist before POST so lost plan responses can be recovered by the same request identity.
    await persist({
      ...local,
      ...(state?.prepareRequestId && !options.has('--new')
        ? { prepareRequestId: state.prepareRequestId, candidateId: state.candidateId }
        : {}),
    });
    const plan = cliPlanSchema.parse(await request('/plans', 'POST', compared, token, link.teamId));
    const { digest, ...unsigned } = plan;
    if (
      hash(new TextEncoder().encode(canonicalCliJson(unsigned))) !== digest ||
      plan.projectId !== link.projectId ||
      plan.uploadId !== compared.uploadId ||
      plan.requestId !== compared.requestId ||
      canonicalCliJson(plan.manifest) !== canonicalCliJson(compared.manifest) ||
      plan.sourceRevision !== receipt.sourceRevision
    )
      throw platformFailure('Deployment plan identity or integrity differs.');
    await persist({
      ...local,
      plan,
      ...(state?.prepareRequestId && !options.has('--new')
        ? { prepareRequestId: state.prepareRequestId, candidateId: state.candidateId }
        : {}),
    });
    emit(plan);
    return;
  }
  if (!state?.plan)
    throw platformFailure('Create a deployment plan for this linked identity first.');
  if (options.positional[0] === 'status') {
    if (state.candidateId) {
      const result = cliPreparationSchema.parse(
        await request(`/candidates/${state.candidateId}`, 'GET', undefined, token, link.teamId),
      );
      if (
        result.planId !== state.plan.id ||
        result.planDigest !== state.plan.digest ||
        result.candidateId !== state.candidateId ||
        result.sourceRevision !== state.plan.sourceRevision
      )
        throw platformFailure('Candidate receipt identity differs.');
      emit(result);
    } else {
      const plan = checkedPlan(
        cliPlanSchema.parse(
          await request(`/plans/${state.plan.id}`, 'GET', undefined, token, link.teamId),
        ),
        state.planInput,
      );
      if (plan.digest !== state.plan.digest || plan.id !== state.plan.id)
        throw platformFailure('Plan receipt identity differs.');
      emit(plan);
    }
    return;
  }
  if (state.plan.admission && state.plan.blockers.length) {
    const issue = state.plan.admission.diagnostics[0];
    throw platformFailure(
      issue
        ? `[${issue.code}] ${visible(issue.message)}`
        : 'This source is not eligible for candidate preparation.',
      'conflict',
      false,
      issue ? visible(issue.action) : 'Review anhedral deploy plan output before preparing.',
    );
  }
  const requestId = state.prepareRequestId ?? randomUUID();
  await persist({ ...state, prepareRequestId: requestId });
  const prepared = cliPreparationSchema.parse(
    await request(
      '/candidates',
      'POST',
      { protocol: 1, requestId, planId: state.plan.id, planDigest: state.plan.digest },
      token,
      link.teamId,
    ),
  );
  if (
    prepared.planId !== state.plan.id ||
    prepared.planDigest !== state.plan.digest ||
    prepared.sourceRevision !== state.plan.sourceRevision
  )
    throw platformFailure('Candidate receipt identity differs.');
  await persist({ ...state, prepareRequestId: requestId, candidateId: prepared.candidateId });
  emit(prepared);
  return;
}
