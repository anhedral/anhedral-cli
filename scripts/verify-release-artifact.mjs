import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { isValidSemver } from './check-release-policy.mjs';

const metadataPath = path.resolve(process.argv[2] ?? '.artifacts/release/metadata.json');
function regularJson(file) {
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 2 * 1024 * 1024)
    throw new Error('Release metadata must be a bounded regular file');
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    throw new Error('Invalid release metadata JSON');
  }
}
const metadata = regularJson(metadataPath);
const expectations = [
  ['name', process.env.ANHEDRAL_EXPECTED_NAME],
  ['version', process.env.ANHEDRAL_EXPECTED_VERSION],
  ['filename', process.env.ANHEDRAL_EXPECTED_FILENAME],
  ['integrity', process.env.ANHEDRAL_EXPECTED_INTEGRITY],
];

if (metadata.schemaVersion !== 1) {
  throw new Error(`Unsupported release metadata schema: ${metadata.schemaVersion}`);
}

if (metadata.name !== 'anhedral') {
  throw new Error(`Unexpected release package name: ${metadata.name}`);
}

if (!isValidSemver(metadata.version)) {
  throw new Error('Release version must be valid SemVer');
}

if (
  typeof metadata.integrity !== 'string' ||
  !/^sha512-[A-Za-z0-9+/]{86}==$/.test(metadata.integrity)
) {
  throw new Error('Release integrity must be an sha512 SRI value');
}

if (typeof metadata.shasum !== 'string' || !/^[a-f0-9]{40}$/.test(metadata.shasum)) {
  throw new Error('Release shasum must be a SHA-1 hex digest');
}

if (!Number.isSafeInteger(metadata.size) || metadata.size < 1) {
  throw new Error(`Release size must be a positive safe integer: ${metadata.size}`);
}

if (
  typeof metadata.filename !== 'string' ||
  metadata.filename !== `anhedral-${metadata.version}.tgz` ||
  metadata.filename !== path.basename(metadata.filename)
) {
  throw new Error(`Release tarball filename must not contain a path: ${metadata.filename}`);
}

for (const [field, expected] of expectations) {
  if (expected && metadata[field] !== expected) {
    throw new Error(
      `Release metadata ${field} mismatch: expected ${expected}, received ${metadata[field]}`,
    );
  }
}

const tarballPath = path.join(path.dirname(metadataPath), metadata.filename);
const tarballStat = lstatSync(tarballPath);
if (!tarballStat.isFile() || tarballStat.isSymbolicLink()) {
  throw new Error('Release tarball must be a regular non-symbolic-link file');
}
const tarball = readFileSync(tarballPath);
const integrity = `sha512-${createHash('sha512').update(tarball).digest('base64')}`;
const shasum = createHash('sha1').update(tarball).digest('hex');
const size = tarballStat.size;

if (integrity !== metadata.integrity) {
  throw new Error(
    `Tarball integrity mismatch: expected ${metadata.integrity}, received ${integrity}`,
  );
}

if (shasum !== metadata.shasum) {
  throw new Error(`Tarball shasum mismatch: expected ${metadata.shasum}, received ${shasum}`);
}

if (size !== metadata.size) {
  throw new Error(`Tarball size mismatch: expected ${metadata.size}, received ${size}`);
}

console.log(`Verified ${metadata.name}@${metadata.version}: ${metadata.integrity}`);

function verifyPlugin(plugin, version, directory) {
  if (!plugin) throw new Error('This release requires a verified plugin archive');
  if (
    plugin.schemaVersion !== 1 ||
    !Number.isSafeInteger(plugin.size) ||
    plugin.size < 1 ||
    typeof plugin.integrity !== 'string' ||
    !/^sha512-[A-Za-z0-9+/]{86}==$/.test(plugin.integrity) ||
    plugin.version !== version ||
    plugin.cliVersion !== version ||
    plugin.filename !== `anhedral-plugin-${version}.zip`
  )
    throw new Error('Plugin release identity mismatch');
  if (
    process.env.ANHEDRAL_EXPECTED_PLUGIN_INTEGRITY &&
    plugin.integrity !== process.env.ANHEDRAL_EXPECTED_PLUGIN_INTEGRITY
  )
    throw new Error('Plugin metadata does not match the reviewed plugin integrity');
  const declaration = regularJson(path.join(directory, 'plugin-metadata.json'));
  const fields = ['schemaVersion', 'version', 'cliVersion', 'filename', 'integrity', 'size'];
  if (
    Object.keys(declaration).some((key) => !fields.includes(key)) ||
    fields.some((key) => declaration[key] !== plugin[key])
  )
    throw new Error('Plugin metadata declarations disagree');
  const filename = path.join(directory, plugin.filename);
  const stat = lstatSync(filename);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error('Plugin archive must be a regular file');
  const contents = readFileSync(filename);
  const integrity = `sha512-${createHash('sha512').update(contents).digest('base64')}`;
  if (integrity !== plugin.integrity || contents.length !== plugin.size)
    throw new Error('Plugin integrity mismatch');
}
verifyPlugin(metadata.plugin, metadata.version, path.dirname(metadataPath));
