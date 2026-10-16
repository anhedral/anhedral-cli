import { existsSync, lstatSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBoundedFile } from './bounded-file.js';
import { pnpmPatchPolicy } from './pnpm-policy.js';
import { writeFile } from './util.js';

interface ReviewedPatch {
  coordinate: string;
  packageName: string;
  license: string;
}
const bracesPatch: ReviewedPatch = {
  coordinate: 'braces@3.0.3',
  packageName: 'braces',
  license: 'LICENSE.braces',
};
// Additional coordinates require reviewed fixes for every shipped entry point.
const reviewedPatches: readonly ReviewedPatch[] = [
  bracesPatch,
  { coordinate: 'node-forge@1.4.0', packageName: 'node-forge', license: 'LICENSE.node-forge' },
];
const lockMaximum = 16 * 1024 * 1024;
const policyMaximum = 2 * 1024 * 1024;
const patchMaximum = 256 * 1024;
const patchAssetMaximum = 2 * 1024 * 1024;

function patchAttributes(source: string, selected: readonly ReviewedPatch[]): string {
  const rules = selected.flatMap(({ coordinate, license }) => [
    `/patches/${coordinate}.patch text eol=lf -whitespace`,
    `/patches/${license} text eol=lf`,
  ]);
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const lines = source.split(/(?<=\n)/);
  // Keep every unrelated rule/comment byte-for-byte, then make these exact
  // asset rules last so a customer wildcard cannot convert patch line endings.
  const preserved = lines.filter((line) => !rules.includes(line.replace(/\r?\n$/, ''))).join('');
  return (
    preserved +
    (preserved && !/\r?\n$/.test(preserved) ? newline : '') +
    rules.join(newline) +
    newline
  );
}

/**
 * Apply only the explicitly reviewed temporary patch to the exact resolved
 * package. Standard pnpm audit remains unchanged and reports its advisory.
 */
function configureSelectedPatches(root: string, patches: readonly ReviewedPatch[]): boolean {
  root = realpathSync(root);
  const lock = readBoundedFile(path.join(root, 'pnpm-lock.yaml'), lockMaximum).toString('utf8');
  const selected = patches.filter(({ coordinate }) => {
    const escaped = [...coordinate]
      .map((character) => ('.^$|?*+()[]{}\\'.includes(character) ? `\\${character}` : character))
      .join('');
    return new RegExp(
      String.raw`^  ['"]?${escaped}(?:\([^'"\r\n]*\))?['"]?:[ \t]*(?:\r?\n|$)`,
      'm',
    ).test(lock);
  });
  if (!selected.length) return false;
  const manifestFile = path.join(root, 'package.json');
  if (existsSync(manifestFile)) {
    const manifest = JSON.parse(readBoundedFile(manifestFile, policyMaximum).toString('utf8'));
    if (manifest.pnpm && Object.hasOwn(manifest.pnpm, 'patchedDependencies'))
      throw new Error(
        'Review package-level pnpm.patchedDependencies before configuring a workspace patch; existing patch maps must not be shadowed.',
      );
  }
  const workspaceFile = path.join(root, 'pnpm-workspace.yaml');
  const before = readBoundedFile(workspaceFile, policyMaximum).toString('utf8');
  const after = selected.reduce(
    (policy, { coordinate }) => pnpmPatchPolicy(policy, coordinate, `patches/${coordinate}.patch`),
    before,
  );
  const attributesFile = path.join(root, '.gitattributes');
  const attributesStat = lstatSync(attributesFile, { throwIfNoEntry: false });
  const attributesBefore = attributesStat
    ? readBoundedFile(attributesFile, policyMaximum).toString('utf8')
    : '';
  const attributesAfter = patchAttributes(attributesBefore, selected);
  const directory = path.join(root, 'patches');
  const directoryStat = lstatSync(directory, { throwIfNoEntry: false });
  if (directoryStat && (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()))
    throw new Error('Patch directory must be a real directory inside the project.');
  const artifacts = selected
    .flatMap(({ coordinate, packageName, license }) => [
      { name: `${coordinate}.patch`, packageName, label: 'patch' },
      { name: license, packageName, label: 'license notice' },
    ])
    .map(({ name, label, packageName }) => ({
      target: path.join(directory, name),
      label,
      packageName,
      maximum: name.endsWith('.patch') ? patchAssetMaximum : patchMaximum,
      bytes: readBoundedFile(
        fileURLToPath(new URL(`../assets/patches/${name}`, import.meta.url)),
        name.endsWith('.patch') ? patchAssetMaximum : patchMaximum,
      ),
    }));
  const missing: typeof artifacts = [];
  // Validate every destination before writing any artifact or the YAML map.
  for (const artifact of artifacts) {
    if (lstatSync(artifact.target, { throwIfNoEntry: false })) {
      if (!readBoundedFile(artifact.target, artifact.maximum).equals(artifact.bytes))
        throw new Error(
          `The ${artifact.packageName} ${artifact.label} path already contains different customer content.`,
        );
    } else missing.push(artifact);
  }
  if (!missing.length && after === before && attributesAfter === attributesBefore) return false;
  if (missing.length) mkdirSync(directory, { recursive: true });
  for (const artifact of missing)
    writeFileSync(artifact.target, artifact.bytes, { flag: 'wx', mode: 0o644 });
  if (after !== before) writeFile(workspaceFile, after);
  if (attributesAfter !== attributesBefore) {
    if (attributesStat) writeFile(attributesFile, attributesAfter);
    else writeFileSync(attributesFile, attributesAfter, { flag: 'wx', mode: 0o644 });
  }
  return true;
}

/** Apply all enabled reviewed exact-version dependency patches as one validated update. */
export function configureDependencyPatches(root: string): boolean {
  return configureSelectedPatches(root, reviewedPatches);
}

/** Compatibility entry point for consumers requesting only the braces backport. */
export function configureBracesPatch(root: string): boolean {
  return configureSelectedPatches(root, [bracesPatch]);
}

/** Install the standard audit gate for every profile, including braces-free apps. */
export function writeDependencyAudit(root: string, replaceManaged = false): void {
  root = realpathSync(root);
  const trusted = readBoundedFile(
    fileURLToPath(new URL('../assets/patches/audit-deps.mjs', import.meta.url)),
    patchMaximum,
  );
  const directory = path.join(root, 'scripts');
  const directoryStat = lstatSync(directory, { throwIfNoEntry: false });
  if (directoryStat && (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()))
    throw new Error('Audit script directory must be a real directory inside the project.');
  const target = path.join(directory, 'audit-deps.mjs');
  if (lstatSync(target, { throwIfNoEntry: false })) {
    const current = readBoundedFile(target, patchMaximum);
    if (current.equals(trusted)) return;
    if (!replaceManaged)
      throw new Error('The dependency audit script path contains different customer content.');
    // Replacements occur only inside the add staging transaction. Its source
    // fingerprints reject edited or untracked customer files before commit.
    writeFile(target, trusted.toString('utf8'));
    return;
  }
  mkdirSync(directory, { recursive: true });
  writeFileSync(target, trusted, { flag: 'wx', mode: 0o644 });
}
