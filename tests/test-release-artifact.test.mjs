import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import {
  resolvePublishedCliArtifact,
  isPublishedCliArtifact,
  ArtifactUnavailableError,
} from '../dist/release-artifact.js';
import { GENERATOR_VERSION as version } from '../dist/version.js';

const revision = 'a'.repeat(40);
const integrity =
  'sha512-' + createHash('sha512').update('exact published fixture').digest('base64');
const metadataUrl = `https://github.com/anhedral/anhedral-cli/releases/download/v${version}/metadata.json`;
const registryUrl = `https://registry.npmjs.org/anhedral/${version}`;
const refUrl = `https://api.github.com/repos/anhedral/anhedral-cli/git/ref/tags/v${version}`;
const metadata = {
  schemaVersion: 1,
  name: 'anhedral',
  version,
  filename: `anhedral-${version}.tgz`,
  sourceRevision: revision,
  integrity,
};
const registry = {
  name: 'anhedral',
  version,
  dist: { integrity, tarball: `https://registry.npmjs.org/anhedral/-/anhedral-${version}.tgz` },
};
const reference = { ref: `refs/tags/v${version}`, object: { type: 'commit', sha: revision } };
function responses(overrides = {}) {
  const seen = [];
  const fetch = async (url, init) => {
    seen.push({ url: String(url), init });
    const value = overrides[String(url)];
    if (value !== undefined)
      return typeof value === 'function'
        ? value(init)
        : value instanceof Response
          ? value
          : Response.json(value);
    if (url === metadataUrl) return Response.json(metadata);
    if (url === registryUrl) return Response.json(registry);
    if (url === refUrl) return Response.json(reference);
    throw new Error('Unexpected endpoint');
  };
  return { seen, fetch };
}
async function unavailable(fetch, options = {}) {
  await assert.rejects(resolvePublishedCliArtifact({ fetch, ...options }), (error) => {
    assert.ok(error instanceof ArtifactUnavailableError);
    assert.equal(error.code, 'ARTIFACT_UNAVAILABLE');
    assert.ok(!error.message.includes('sensitive-fixture-body'));
    assert.ok(!error.message.includes('signed-private-query'));
    return true;
  });
}
test('resolves only running release from fixed official sources without project auth/context', async () => {
  const f = responses();
  const result = await resolvePublishedCliArtifact({ fetch: f.fetch });
  assert.deepEqual(result, { version, sourceRevision: revision, packageIntegrity: integrity });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(isPublishedCliArtifact(result), true);
  assert.equal(isPublishedCliArtifact(JSON.parse(JSON.stringify(result))), false);
  assert.equal(
    isPublishedCliArtifact({ version, sourceRevision: revision, packageIntegrity: integrity }),
    false,
  );
  assert.deepEqual(
    f.seen.map((r) => r.url),
    [metadataUrl, registryUrl, refUrl],
  );
  for (const { init } of f.seen) {
    assert.equal(init.credentials, 'omit');
    assert.equal(init.redirect, 'manual');
    assert.equal(init.referrerPolicy, 'no-referrer');
    assert.deepEqual(Object.keys(init.headers).sort(), ['accept', 'user-agent']);
    assert.equal(init.headers.authorization, undefined);
    assert.equal(init.headers.cookie, undefined);
  }
});
test('allows bounded official release asset redirects and validates annotated tags', async () => {
  const asset =
    'https://release-assets.githubusercontent.com/github-production-release-asset/fixture/metadata.json?signature=fixture';
  const tag = 'b'.repeat(40);
  const tagUrl = `https://api.github.com/repos/anhedral/anhedral-cli/git/tags/${tag}`;
  const f = responses({
    [metadataUrl]: new Response(null, { status: 302, headers: { location: asset } }),
    [asset]: metadata,
    [refUrl]: { ref: `refs/tags/v${version}`, object: { type: 'tag', sha: tag } },
    [tagUrl]: { tag: `v${version}`, object: { type: 'commit', sha: revision } },
  });
  const artifact = await resolvePublishedCliArtifact({ fetch: f.fetch });
  assert.equal(artifact.sourceRevision, revision);
  assert.deepEqual(
    f.seen.map((r) => r.url),
    [metadataUrl, asset, registryUrl, refUrl, tagUrl],
  );
});
const userinfoRedirect = new URL('https://release-assets.githubusercontent.com/metadata');
userinfoRedirect.username = 'fixture-user';
userinfoRedirect.password = 'fixture-value';
for (const location of [
  'http://release-assets.githubusercontent.com/metadata',
  'https://release-assets.githubusercontent.com.evil.example/metadata',
  'https://api.github.com/repos/foreign/private?token=signed-private-query',
  userinfoRedirect.href,
  'https://release-assets.githubusercontent.com:444/metadata',
  'file:///private/project/metadata.json',
  'https://registry.npmjs.org/anhedral/metadata',
])
  test(`rejects a release redirect outside exact asset host: ${new URL(location).protocol} ${new URL(location).hostname}`, async () => {
    const f = responses({
      [metadataUrl]: new Response(null, { status: 302, headers: { location } }),
    });
    await unavailable(f.fetch);
    assert.equal(f.seen.length, 1);
  });
test('refuses redirect loops and npm or tag endpoint redirects', async () => {
  const asset = 'https://release-assets.githubusercontent.com/loop';
  await unavailable(
    responses({
      [metadataUrl]: () => new Response(null, { status: 302, headers: { location: asset } }),
      [asset]: () => new Response(null, { status: 302, headers: { location: asset } }),
    }).fetch,
  );
  for (const url of [registryUrl, refUrl])
    await unavailable(
      responses({
        [url]: new Response(null, {
          status: 302,
          headers: { location: 'https://release-assets.githubusercontent.com/metadata' },
        }),
      }).fetch,
    );
});
for (const changed of [
  { name: 'foreign' },
  { version: '99.0.0' },
  { filename: '../artifact.tgz' },
  { schemaVersion: 2 },
  { sourceRevision: undefined },
  { sourceRevision: 'main' },
  { sourceRevision: 'A'.repeat(40) },
  { integrity: 'sha1-no' },
])
  test(`rejects malformed or foreign metadata: ${Object.keys(changed)[0]} ${JSON.stringify(changed)}`, async () => {
    await unavailable(responses({ [metadataUrl]: { ...metadata, ...changed } }).fetch);
  });
test('cross-checks npm package identity, integrity, tarball host and optional gitHead', async () => {
  for (const changed of [
    { name: 'foreign' },
    { version: '99.0.0' },
    { gitHead: 'b'.repeat(40) },
    { dist: { ...registry.dist, integrity: 'sha512-' + 'B'.repeat(86) + '==' } },
    { dist: { ...registry.dist, tarball: 'https://foreign.example/anhedral.tgz' } },
  ])
    await unavailable(responses({ [registryUrl]: { ...registry, ...changed } }).fetch);
});
test('binds source SHA to official commit tag, rejects forged, nested or noncommit tag targets', async () => {
  for (const object of [
    { type: 'commit', sha: 'b'.repeat(40) },
    { type: 'tree', sha: revision },
    { type: 'tag', sha: '../foreign' },
  ])
    await unavailable(responses({ [refUrl]: { ...reference, object } }).fetch);
  await unavailable(responses({ [refUrl]: { ...reference, ref: 'refs/tags/v99.0.0' } }).fetch);
  const tag = 'b'.repeat(40),
    tagUrl = `https://api.github.com/repos/anhedral/anhedral-cli/git/tags/${tag}`;
  for (const target of [
    { tag: `v${version}`, object: { type: 'tag', sha: revision } },
    { tag: 'v99.0.0', object: { type: 'commit', sha: revision } },
    { tag: `v${version}`, object: { type: 'commit', sha: 'c'.repeat(40) } },
  ])
    await unavailable(
      responses({ [refUrl]: { ...reference, object: { type: 'tag', sha: tag } }, [tagUrl]: target })
        .fetch,
    );
});
test('body limits apply to advertised length and actual streamed bytes', async () => {
  await unavailable(
    responses({
      [metadataUrl]: new Response('{}', { headers: { 'content-length': String(256 * 1024 + 1) } }),
    }).fetch,
  );
  await unavailable(responses({ [metadataUrl]: new Response('x'.repeat(256 * 1024 + 1)) }).fetch);
  await unavailable(
    responses({ [metadataUrl]: new Response('{invalid-json-sensitive-fixture-body') }).fetch,
  );
  await unavailable(
    responses({ [metadataUrl]: new Response('sensitive-fixture-body', { status: 404 }) }).fetch,
  );
});
test('timeouts and cancellation bound stalled fetches and streamed bodies', async () => {
  await unavailable(async () => new Promise(() => {}), { timeoutMs: 10 });
  await unavailable(
    responses({ [metadataUrl]: new Response(new ReadableStream({ start() {} })) }).fetch,
    { timeoutMs: 10 },
  );
  const controller = new AbortController();
  controller.abort();
  const f = responses();
  await unavailable(f.fetch, { signal: controller.signal });
  assert.equal(f.seen.length, 0);
});
test('no embedded artifact hash or unverified response fallback is returned when the release is unavailable', async () => {
  const f = responses({ [registryUrl]: new Response('sensitive-fixture-body', { status: 404 }) });
  await unavailable(f.fetch);
  assert.equal(f.seen.length, 2);
});
