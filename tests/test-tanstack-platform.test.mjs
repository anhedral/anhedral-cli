import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runPlatformCommand } from '../dist/platform-command.js';
import { readPrivate, writePrivate } from '../dist/platform-state.js';
import {
  canonicalCliJson,
  cliPlanSchema,
  cliPreparationSchema,
} from '../dist/contracts/cli-transport.js';
import { composeSourceProvenance, launchCompositionSchema } from '../dist/composition.js';

const fixture = JSON.parse(
  readFileSync(new URL('./fixtures/deployment-contract/fixtures.json', import.meta.url)),
);
const origin = 'https://platform.example';
const principalId = 'a0b9d370-073d-4cf3-ab6c-4aaa03726b91';
const projectId = '54fa830a-bb84-42e4-aefc-39469e6ffbb5';
const teamId = '184ac54c-75c2-4716-bc98-fb467fe0779f';
const expiresAt = '2099-01-01T00:00:00.000Z';
const credentials = { protocol: 1, origin, token: 'acl_' + 'a'.repeat(64), expiresAt };
const digest = (value) => createHash('sha256').update(canonicalCliJson(value)).digest('hex');
const capture = () => {
  const output = { text: '' };
  output.options = {
    json: true,
    io: {
      out: {
        write: (text) => {
          output.text += text;
        },
      },
      err: { write: () => {} },
    },
  };
  return output;
};
async function workspace(t, manifest) {
  const previous = process.cwd();
  const root = await realpath(await mkdtemp(join(tmpdir(), 'anhedral-tanstack-plan-')));
  process.chdir(root);
  t.after(async () => {
    process.chdir(previous);
    await rm(root, { recursive: true, force: true });
  });
  const input = {
    protocol: 1,
    requestId: randomUUID(),
    projectId,
    teamId,
    archiveDigest: 'b'.repeat(64),
    archiveBytes: 1,
    inventoryDigest: 'c'.repeat(64),
    cliVersion: manifest.cliArtifact.version,
    chunks: ['d'.repeat(64)],
  };
  const uploadId = randomUUID();
  await writePrivate(join(root, '.anhedral/platform/project.json'), {
    protocol: 1,
    origin,
    principalId,
    projectId,
    teamId,
    name: 'Fixture project',
  });
  await writePrivate(join(root, '.anhedral/platform/upload.json'), {
    origin,
    principalId,
    input,
    uploadId,
  });
  await writeFile(join(root, 'deployment.json'), JSON.stringify(manifest));
  // Planning is bound to the saved upload, not to newer edits in the local workspace.
  await writeFile(
    join(root, 'anhedral.json'),
    JSON.stringify({ composition: { foundation: 'local-edits-after-upload' } }),
  );
  return { root, input, uploadId };
}

for (const { composition, manifest } of fixture.tanstackCompositions) {
  test(`TanStack CLI plan/prepare/status preserves ${manifest.capabilities.join('+') || 'web-only'} source and public receipt identity`, async (t) => {
    const { root, input: upload, uploadId } = await workspace(t, manifest);
    const calls = [];
    let plan;
    const candidateId = randomUUID();
    const fetch = async (url, request) => {
      const path = new URL(url).pathname;
      calls.push({ path, method: request.method });
      if (path.endsWith('/actor'))
        return Response.json({ protocol: 1, principalId, name: 'Fixture developer', teamId });
      if (path.endsWith('/uploads/' + uploadId))
        return Response.json({
          ...upload,
          id: uploadId,
          received: [0],
          state: 'sealed',
          expiresAt,
          sourceRevision: upload.archiveDigest,
          teamId: undefined,
          archiveBytes: undefined,
          cliVersion: undefined,
          chunks: undefined,
        });
      if (path.endsWith('/plans')) {
        const input = JSON.parse(request.body);
        assert.deepEqual(input.manifest, manifest);
        const unsigned = {
          protocol: 1,
          id: randomUUID(),
          requestId: input.requestId,
          projectId,
          uploadId,
          manifest: input.manifest,
          sourceRevision: upload.archiveDigest,
          inventoryDigest: upload.inventoryDigest,
          lockDigest: 'd'.repeat(64),
          routing: { generation: 0, activeReleaseId: null, desiredReleaseId: null },
          routingRevision: 'e'.repeat(64),
          expectedGeneration: 0,
          migrationDigests: [],
          expiresAt,
          configurationRevision: null,
          artifactVerified: false,
          hostedAdmission: false,
          identityAction: 'preserve',
          blockers: [
            'HOSTED_ADMISSION_DISABLED',
            'ARTIFACT_UNREVIEWED',
            'CONFIGURATION_UNVERIFIED',
          ],
        };
        plan = { ...unsigned, digest: digest(unsigned) };
        return Response.json(plan);
      }
      const receipt = {
        protocol: 1,
        planId: plan.id,
        planDigest: plan.digest,
        candidateId,
        sourceRevision: plan.sourceRevision,
        identityAction: 'preserve',
      };
      if (path.endsWith('/candidates'))
        return Response.json({ ...receipt, state: 'building', hostedAdmission: false });
      if (path.endsWith('/candidates/' + candidateId))
        return Response.json({ ...receipt, state: 'ready', hostedAdmission: true });
      throw Error('Unexpected deployment endpoint ' + path);
    };
    const dependencies = { store: { read: async () => credentials }, fetch };
    for (const operation of ['plan', 'prepare', 'status']) {
      const output = capture();
      await runPlatformCommand(
        'deploy',
        [
          operation,
          ...(operation === 'plan' ? ['--manifest', 'deployment.json'] : []),
          '--api-url',
          origin,
        ],
        output.options,
        dependencies,
      );
      const result = JSON.parse(output.text);
      if (operation === 'plan') assert.deepEqual(result.manifest, manifest);
      else {
        assert.equal(result.candidateId, candidateId);
        assert.equal(Object.hasOwn(result, 'admission'), false);
      }
      for (const field of ['runtimeImage', 'policyDigest']) {
        assert.equal(Object.hasOwn(result, field), false);
        if (operation === 'plan')
          assert.equal(cliPlanSchema.safeParse({ ...result, [field]: 'internal' }).success, false);
      }
    }
    const saved = await readPrivate(join(root, '.anhedral/platform/deployment.json'));
    assert.equal(saved.candidateId, candidateId);
    assert.deepEqual(saved.plan.manifest, manifest);
    assert.equal(
      calls.some((call) => /releases|staging|publish/.test(call.path)),
      false,
    );
    assert.deepEqual(launchCompositionSchema.parse(composition), composition);
    const composed = composeSourceProvenance(
      composition,
      Object.keys(composition.capabilities),
      [],
    );
    assert.equal(composed.foundation, 'tanstack-start');
    assert.equal(composed.contractVersion, 2);
  });
}

test('TanStack CLI rejects an incorrect foundation/profile before creating a plan request', async (t) => {
  const manifest = structuredClone(fixture.tanstackCompositions[0].manifest);
  manifest.intent.runtimeProfile = 'cli-next-web-v1';
  const { root, input: upload, uploadId } = await workspace(t, manifest);
  let posts = 0;
  await assert.rejects(
    runPlatformCommand(
      'deploy',
      ['plan', '--manifest', 'deployment.json', '--api-url', origin],
      capture().options,
      {
        store: { read: async () => credentials },
        fetch: async (url, request) => {
          if (request.method === 'POST') posts++;
          if (url.endsWith('/actor'))
            return Response.json({ protocol: 1, principalId, name: 'Fixture developer', teamId });
          return Response.json({
            protocol: 1,
            id: uploadId,
            requestId: upload.requestId,
            projectId,
            archiveDigest: upload.archiveDigest,
            inventoryDigest: upload.inventoryDigest,
            received: [0],
            state: 'sealed',
            expiresAt,
            sourceRevision: upload.archiveDigest,
          });
        },
      },
    ),
    (error) =>
      error.code === 'INVALID_ARGUMENT' && /anhedral-stack runtime profile/.test(error.message),
  );
  assert.equal(posts, 0);
  assert.equal(await readPrivate(join(root, '.anhedral/platform/deployment.json')), null);
});

test('public candidate receipts reject internal admission, image and policy fields', () => {
  const base = {
    protocol: 1,
    planId: randomUUID(),
    planDigest: 'a'.repeat(64),
    candidateId: randomUUID(),
    sourceRevision: 'b'.repeat(64),
    state: 'building',
    hostedAdmission: false,
    identityAction: 'preserve',
  };
  assert.deepEqual(cliPreparationSchema.parse(base), base);
  const admission = {
    policyDigest: 'c'.repeat(64),
    image: 'registry.example.com/fixture/candidate@sha256:' + 'd'.repeat(64),
    scope: 'candidate-workspace',
  };
  for (const internal of [
    { admission },
    { admission: null },
    { image: admission.image },
    { runtimeImage: admission.image },
    { policyDigest: admission.policyDigest },
  ])
    assert.equal(cliPreparationSchema.safeParse({ ...base, ...internal }).success, false);
});
