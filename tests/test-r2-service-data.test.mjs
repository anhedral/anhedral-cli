import { test } from 'node:test';
import assert from 'node:assert/strict';
import { browseR2Objects } from '../dist/r2-service-data.js';
const service = {
  key: 'binding:apps/api:R2:FILES',
  kind: 'r2',
  id: 'fixture-bucket',
  name: 'fixture-bucket',
  accountId: 'a'.repeat(32),
  projectId: '00000000-0000-4000-8000-000000000001',
  applications: ['apps/api'],
  ownership: 'created',
};
const env = {
  ANHEDRAL_R2_ACCESS_KEY_ID: 'fixture-key-id',
  ANHEDRAL_R2_SECRET_ACCESS_KEY: 'fixture-secret',
};
const xml =
  '<ListBucketResult xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Name>fixture-bucket</Name><IsTruncated>true</IsTruncated><Contents><Key>notes&amp;draft.txt</Key><Size>42</Size><LastModified>2026-10-14T00:00:00.000Z</LastModified></Contents><NextContinuationToken>next+token=</NextContinuationToken></ListBucketResult>';
test('R2 signs only the selected account/bucket metadata request and preserves its cursor', async () => {
  let request;
  const data = await browseR2Objects(service, 'previous+token=', env, async (url, options) => {
    request = { url, options };
    return new Response(xml);
  });
  assert.equal(
    new URL(request.url).origin,
    `https://${service.accountId}.r2.cloudflarestorage.com`,
  );
  assert.equal(new URL(request.url).pathname, '/fixture-bucket');
  assert.equal(new URL(request.url).searchParams.get('continuation-token'), 'previous+token=');
  assert.equal(request.options.method, 'GET');
  assert.equal(request.options.redirect, 'error');
  assert.match(
    request.options.headers.Authorization,
    /AWS4-HMAC-SHA256 Credential=fixture-key-id\/\d{8}\/auto\/s3\/aws4_request/,
  );
  assert.match(request.options.headers.Authorization, /Signature=[a-f0-9]{64}$/);
  assert.deepEqual(data.rows, [['notes&draft.txt', 42, '2026-10-14T00:00:00.000Z']]);
  assert.equal(data.nextCursor, 'next+token=');
  assert.doesNotMatch(JSON.stringify(data), /fixture-secret|Signature=/);
});
test('R2 rejects foreign buckets, XML entities, oversized pages and permission errors without exposing credentials', async () => {
  for (const value of [
    xml.replace('<Name>fixture-bucket', '<Name>someone-else'),
    '<!DOCTYPE x>' + xml,
    xml.replace('<IsTruncated>true</IsTruncated>', ''),
  ])
    await assert.rejects(
      browseR2Objects(service, undefined, env, async () => new Response(value)),
      /could not be read/,
    );
  await assert.rejects(
    browseR2Objects(
      service,
      undefined,
      env,
      async () => new Response('private provider diagnostics', { status: 403 }),
    ),
    /could not be read/,
  );
  await assert.rejects(
    browseR2Objects({ ...service, accountId: '../outside' }, undefined, env, async () => {
      throw new Error('must not call');
    }),
    /supported R2/,
  );
});
