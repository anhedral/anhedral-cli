import { validatePluginRemote } from './plugin-remote.mjs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isValidSemver } from './check-release-policy.mjs';

const MAX_ARCHIVE = 16 * 1024 * 1024;
const MAX_FILE = 8 * 1024 * 1024;
const SHA = /^[a-f0-9]{40}$/;
const digest = (bytes, algorithm, encoding = 'hex') =>
  createHash(algorithm).update(bytes).digest(encoding);
function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function range(bytes, offset, length) {
  if (offset < 0 || length < 0 || offset + length > bytes.length)
    throw new Error('Truncated plugin archive.');
  return bytes.subarray(offset, offset + length);
}
/** Accept only the bounded, uncompressed regular-entry ZIP format used by package-plugin. */
export function readStoredArchive(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 22 || bytes.length > MAX_ARCHIVE)
    throw new Error('Invalid plugin archive size.');
  const end = bytes.length - 22;
  if (
    bytes.readUInt32LE(end) !== 0x06054b50 ||
    bytes.readUInt16LE(end + 4) ||
    bytes.readUInt16LE(end + 6) ||
    bytes.readUInt16LE(end + 20)
  )
    throw new Error('Unsupported plugin archive footer.');
  const count = bytes.readUInt16LE(end + 10);
  const size = bytes.readUInt32LE(end + 12);
  const start = bytes.readUInt32LE(end + 16);
  if (!count || count > 512 || bytes.readUInt16LE(end + 8) !== count || start + size !== end)
    throw new Error('Invalid plugin archive directory.');
  const files = [];
  const names = new Set();
  let centralOffset = start;
  let localOffset = 0;
  for (let index = 0; index < count; index++) {
    const central = range(bytes, centralOffset, 46);
    if (
      central.readUInt32LE(0) !== 0x02014b50 ||
      central.readUInt16LE(8) ||
      central.readUInt16LE(10) ||
      central.readUInt16LE(30) ||
      central.readUInt16LE(32) ||
      central.readUInt16LE(34) ||
      central.readUInt32LE(38)
    )
      throw new Error('Unsupported plugin archive entry.');
    const length = central.readUInt32LE(24);
    if (
      length > MAX_FILE ||
      central.readUInt32LE(20) !== length ||
      central.readUInt32LE(42) !== localOffset
    )
      throw new Error('Invalid plugin archive entry bounds.');
    const nameBytes = range(bytes, centralOffset + 46, central.readUInt16LE(28));
    const name = nameBytes.toString('utf8');
    if (
      !/^[a-zA-Z0-9_.\/-]{1,255}$/.test(name) ||
      name.startsWith('/') ||
      name.endsWith('/') ||
      name
        .split('/')
        .some((part) => !part || part === '.' || part === '..' || part.toLowerCase() === '.git') ||
      names.has(name.toLowerCase())
    )
      throw new Error('Unsafe or duplicate plugin archive path.');
    names.add(name.toLowerCase());
    const local = range(bytes, localOffset, 30);
    if (
      local.readUInt32LE(0) !== 0x04034b50 ||
      local.readUInt16LE(6) ||
      local.readUInt16LE(8) ||
      local.readUInt16LE(28) ||
      local.readUInt32LE(14) !== central.readUInt32LE(16) ||
      local.readUInt32LE(18) !== length ||
      local.readUInt32LE(22) !== length ||
      local.readUInt16LE(26) !== nameBytes.length ||
      !range(bytes, localOffset + 30, nameBytes.length).equals(nameBytes)
    )
      throw new Error('Plugin archive headers disagree.');
    const contents = range(bytes, localOffset + 30 + nameBytes.length, length);
    if (crc32(contents) !== central.readUInt32LE(16))
      throw new Error('Plugin archive checksum mismatch.');
    files.push({ name, contents });
    localOffset += 30 + nameBytes.length + length;
    centralOffset += 46 + nameBytes.length;
  }
  if (centralOffset !== end || localOffset !== start)
    throw new Error('Plugin archive has unexpected data.');
  for (const { name } of files) {
    const parts = name.toLowerCase().split('/');
    for (let index = 1; index < parts.length; index++)
      if (names.has(parts.slice(0, index).join('/')))
        throw new Error('Plugin archive paths conflict.');
  }
  return files;
}
function regularFile(file, limit) {
  const stat = lstatSync(file);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size > limit ||
    realpathSync(path.dirname(file)) !== path.dirname(file)
  )
    throw new Error('Release input must be a bounded regular file without symlink parents.');
  return readFileSync(file);
}
export function loadPluginRelease(metadataPath) {
  metadataPath = path.resolve(metadataPath);
  const release = JSON.parse(regularFile(metadataPath, 2 * 1024 * 1024).toString('utf8'));
  const plugin = release.plugin;
  if (
    release.schemaVersion !== 1 ||
    release.name !== 'anhedral' ||
    !isValidSemver(release.version) ||
    !plugin ||
    plugin.schemaVersion !== 1 ||
    plugin.version !== release.version ||
    plugin.cliVersion !== release.version ||
    plugin.filename !== `anhedral-plugin-${release.version}.zip` ||
    !/^sha512-[A-Za-z0-9+/]{86}==$/.test(plugin.integrity) ||
    !Number.isSafeInteger(plugin.size) ||
    plugin.size < 1 ||
    plugin.size > MAX_ARCHIVE
  )
    throw new Error('Plugin release metadata identity mismatch.');
  const bytes = regularFile(path.join(path.dirname(metadataPath), plugin.filename), MAX_ARCHIVE);
  if (
    bytes.length !== plugin.size ||
    `sha512-${digest(bytes, 'sha512', 'base64')}` !== plugin.integrity
  )
    throw new Error('Plugin release integrity mismatch.');
  const files = readStoredArchive(bytes);
  const json = (name) => {
    const file = files.find((file) => file.name === name);
    if (!file || file.contents.length > 1024 * 1024)
      throw new Error('Plugin archive is missing required release files.');
    return JSON.parse(file.contents.toString('utf8'));
  };
  const manifest = json('plugin.json');
  const stack = json('references/stack-registry.json');
  if (
    manifest.name !== 'anhedral' ||
    manifest.version !== release.version ||
    stack.cliVersion !== release.version ||
    !Array.isArray(stack.items) ||
    stack.items.some((item) => item.version !== release.version)
  )
    throw new Error('Plugin archive release identity mismatch.');
  if (files.some((file) => file.name.startsWith('runtime/')))
    throw new Error('Plugin cannot package an executable managed runtime.');
  validatePluginRemote(json('mcp.json'));
  for (const skill of ['init', 'design'])
    if (!files.some((file) => file.name === `skills/anhedral-${skill}/SKILL.md`))
      throw new Error('Plugin skill is missing.');
  return { version: release.version, integrity: plugin.integrity, files };
}
function gitObject(type, bytes) {
  return digest(Buffer.concat([Buffer.from(`${type} ${bytes.length}\0`), bytes]), 'sha1');
}
function treeSha(entries) {
  const sorted = [...entries].sort((a, b) =>
    Buffer.compare(
      Buffer.from(a.path + (a.type === 'tree' ? '/' : '')),
      Buffer.from(b.path + (b.type === 'tree' ? '/' : '')),
    ),
  );
  const bytes = Buffer.concat(
    sorted.map((entry) =>
      Buffer.concat([
        Buffer.from(`${entry.mode.replace(/^0/, '')} ${entry.path}\0`),
        Buffer.from(entry.sha, 'hex'),
      ]),
    ),
  );
  return gitObject('tree', bytes);
}
function pluginTree(files) {
  const root = new Map();
  for (const file of files) {
    const parts = file.name.split('/');
    let node = root;
    for (const part of parts.slice(0, -1)) {
      if (!node.has(part)) node.set(part, new Map());
      node = node.get(part);
    }
    node.set(parts.at(-1), gitObject('blob', file.contents));
  }
  const compute = (node) =>
    treeSha(
      [...node].map(([name, value]) => ({
        path: name,
        mode: value instanceof Map ? '040000' : '100644',
        type: value instanceof Map ? 'tree' : 'blob',
        sha: value instanceof Map ? compute(value) : value,
      })),
    );
  return compute(root);
}
/** Publish only an immutable Git tag. This function never updates a branch or existing ref. */
export async function publishPluginSource(
  { metadataPath, repository, releaseSha, token },
  send = fetch,
) {
  const release = loadPluginRelease(metadataPath);
  if (
    typeof repository !== 'string' ||
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}\/[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/.test(repository) ||
    typeof releaseSha !== 'string' ||
    !SHA.test(releaseSha) ||
    typeof token !== 'string' ||
    !token.trim()
  )
    throw new Error('Repository, release SHA and GitHub credentials are required.');
  const prefix = `https://api.github.com/repos/${repository}`;
  async function request(route, body, missing = false) {
    let response;
    try {
      response = await send(prefix + route, {
        method: body ? 'POST' : 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new Error(
        'GitHub source publication request failed. Retry only after inspecting the immutable tag.',
      );
    }
    if (missing && response.status === 404) return null;
    if (!response.ok)
      throw Object.assign(
        new Error(`GitHub source publication returned HTTP ${response.status}.`),
        { status: response.status },
      );
    const chunks = [];
    let length = 0;
    try {
      for await (const chunk of response.body ?? []) {
        length += chunk.byteLength;
        if (length > 2 * 1024 * 1024) throw new Error('Response limit.');
        chunks.push(Buffer.from(chunk));
      }
    } catch {
      throw new Error('GitHub publication response was interrupted or exceeded its limit.');
    }
    const bytes = Buffer.concat(chunks);
    try {
      return JSON.parse(Buffer.from(bytes).toString('utf8'));
    } catch {
      throw new Error('GitHub returned invalid publication metadata.');
    }
  }
  function validSha(value) {
    if (typeof value !== 'string' || !SHA.test(value))
      throw new Error('GitHub returned an invalid object identity.');
    return value;
  }
  async function readTree(sha) {
    const result = await request(`/git/trees/${validSha(sha)}`);
    if (result.truncated || !Array.isArray(result.tree) || result.tree.length > 1000)
      throw new Error('GitHub returned an invalid release tree.');
    return result.tree.map((entry) => {
      if (
        !entry.path ||
        entry.path.includes('/') ||
        /[\0\r\n]/.test(entry.path) ||
        !['100644', '100755', '040000', '120000', '160000'].includes(entry.mode) ||
        !['blob', 'tree', 'commit'].includes(entry.type)
      )
        throw new Error('GitHub returned an unsafe release tree entry.');
      return { path: entry.path, mode: entry.mode, type: entry.type, sha: validSha(entry.sha) };
    });
  }
  const parent = await request(`/git/commits/${releaseSha}`);
  const rootEntries = await readTree(parent.tree?.sha);
  const plugins = rootEntries.find((entry) => entry.path === 'plugins');
  if (plugins && plugins.type !== 'tree')
    throw new Error('Release plugins path must be a directory.');
  const pluginEntries = plugins ? await readTree(plugins.sha) : [];
  const pluginSha = pluginTree(release.files);
  const newPlugins = [
    ...pluginEntries.filter((entry) => entry.path !== 'anhedral'),
    { path: 'anhedral', mode: '040000', type: 'tree', sha: pluginSha },
  ];
  const newPluginsSha = treeSha(newPlugins);
  const newRoot = [
    ...rootEntries.filter((entry) => entry.path !== 'plugins'),
    { path: 'plugins', mode: '040000', type: 'tree', sha: newPluginsSha },
  ];
  const expectedTree = treeSha(newRoot);
  const tag = `plugin-v${release.version}`;
  const refRoute = `/git/ref/tags/${encodeURIComponent(tag)}`;
  async function existing() {
    let ref = await request(refRoute, undefined, true);
    if (!ref) return null;
    let object = ref.object;
    for (let depth = 0; object?.type === 'tag' && depth < 4; depth++)
      object = (await request(`/git/tags/${validSha(object.sha)}`)).object;
    if (object?.type !== 'commit') throw new Error('Plugin tag does not reference a commit.');
    const commitSha = validSha(object.sha);
    const commit = await request(`/git/commits/${commitSha}`);
    if (
      commit.tree?.sha !== expectedTree ||
      !Array.isArray(commit.parents) ||
      commit.parents.length !== 1 ||
      commit.parents[0].sha !== releaseSha
    )
      throw new Error(
        'Immutable plugin tag already references a different source tree or release parent.',
      );
    return {
      version: release.version,
      tag,
      commitSha,
      treeSha: expectedTree,
      pluginTreeSha: pluginSha,
      created: false,
    };
  }
  const previous = await existing();
  if (previous) return previous;
  for (const file of release.files) {
    const result = await request('/git/blobs', {
      content: file.contents.toString('base64'),
      encoding: 'base64',
    });
    assert.equal(result.sha, gitObject('blob', file.contents), 'GitHub blob identity mismatch.');
  }
  for (const [entries, expected] of [
    [
      release.files.map((file) => ({
        path: file.name,
        mode: '100644',
        type: 'blob',
        sha: gitObject('blob', file.contents),
      })),
      pluginSha,
    ],
    [newPlugins, newPluginsSha],
    [newRoot, expectedTree],
  ]) {
    const result = await request('/git/trees', { tree: entries });
    assert.equal(result.sha, expected, 'GitHub tree identity mismatch.');
  }
  const commit = await request('/git/commits', {
    message: `Package Anhedral plugin ${release.version} from verified ZIP\n\n${release.integrity}`,
    tree: expectedTree,
    parents: [releaseSha],
  });
  const commitSha = validSha(commit.sha);
  try {
    await request('/git/refs', { ref: `refs/tags/${tag}`, sha: commitSha });
  } catch (error) {
    if (![409, 422].includes(error.status)) throw error;
    const raced = await existing();
    if (raced) return raced;
    throw error;
  }
  return {
    version: release.version,
    tag,
    commitSha,
    treeSha: expectedTree,
    pluginTreeSha: pluginSha,
    created: true,
  };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(
      JSON.stringify(
        await publishPluginSource({
          metadataPath: process.argv[2] ?? '.artifacts/release/metadata.json',
          repository: process.env.GITHUB_REPOSITORY,
          releaseSha: process.env.RELEASE_SHA,
          token: process.env.GH_TOKEN,
        }),
      ),
    );
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Plugin source publication failed.');
    process.exitCode = 1;
  }
}
