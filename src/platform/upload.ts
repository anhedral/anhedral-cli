import { createHash, randomUUID } from 'node:crypto';
import {
  SOURCE_LIMITS,
  sourceUploadInputSchema,
  sourceUploadReceiptSchema,
} from '../contracts/cli-transport.js';
import { packageSource } from './source.js';
import { uploadState } from './state-schema.js';
import { readPrivate, writePrivate } from './state.js';
import type { SourceOperation } from './types.js';
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export async function runSourceUpload({
  options,
  origin,
  actor,
  token,
  link,
  uploadPath,
  root,
  request,
  emit,
  platformFailure,
}: SourceOperation) {
  const state = uploadState.safeParse(await readPrivate(uploadPath));
  const checkedState =
    state.success &&
    state.data.origin === origin &&
    state.data.principalId === actor.principalId &&
    state.data.input.projectId === link.projectId &&
    state.data.input.teamId === link.teamId
      ? state.data
      : null;
  if (options.positional[0] === 'status') {
    if (!checkedState?.uploadId)
      throw platformFailure('No resumable upload is saved for this project.');
    emit(
      sourceUploadReceiptSchema.parse(
        await request(`/uploads/${checkedState.uploadId}`, 'GET', undefined, token, link.teamId),
      ),
    );
    return;
  }
  const source = await packageSource(root),
    archiveDigest = hash(source.archive);

  if (checkedState && checkedState.input.archiveDigest !== archiveDigest && !options.has('--new'))
    throw platformFailure(
      'Source changed since the saved upload. Restore those files or explicitly use source upload --new.',
    );
  const chunks = Array.from(
    { length: Math.ceil(source.archive.length / SOURCE_LIMITS.chunkBytes) },
    (_, i) =>
      source.archive.subarray(i * SOURCE_LIMITS.chunkBytes, (i + 1) * SOURCE_LIMITS.chunkBytes),
  );
  const input = sourceUploadInputSchema.parse({
    protocol: 1,
    requestId: checkedState && !options.has('--new') ? checkedState.input.requestId : randomUUID(),
    projectId: link.projectId,
    teamId: link.teamId,
    archiveDigest,
    archiveBytes: source.archive.length,
    inventoryDigest: source.inventoryDigest,
    cliVersion: source.cliVersion,
    chunks: chunks.map(hash),
  });
  // Persist the request identity before the first network mutation, including lost responses.
  const local = { origin, principalId: actor.principalId, input };
  await writePrivate(uploadPath, local);
  const receipt = sourceUploadReceiptSchema.parse(
    await request('/uploads', 'POST', input, token, link.teamId),
  );
  if (
    receipt.projectId !== link.projectId ||
    receipt.requestId !== input.requestId ||
    receipt.archiveDigest !== input.archiveDigest ||
    receipt.inventoryDigest !== input.inventoryDigest
  )
    throw platformFailure('Upload receipt identity differs.');
  await writePrivate(uploadPath, { ...local, uploadId: receipt.id });
  if (receipt.state === 'cancelled')
    throw platformFailure('Upload was cancelled. Start source upload --new.');
  if (receipt.state !== 'sealed') {
    for (let i = 0; i < chunks.length; i++)
      if (!receipt.received.includes(i))
        await request(`/uploads/${receipt.id}/chunks/${i}`, 'PUT', chunks[i], token, link.teamId);
  }
  const complete = sourceUploadReceiptSchema.parse(
    await request(`/uploads/${receipt.id}/complete`, 'POST', {}, token, link.teamId),
  );
  if (
    complete.id !== receipt.id ||
    complete.sourceRevision !== archiveDigest ||
    complete.state !== 'sealed'
  )
    throw platformFailure('Source completion was not sealed. Resume this upload.');
  emit({ ...complete, hostedAdmission: false });
}
