import { existsSync, lstatSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBoundedFile } from './bounded-file.js';
import { pnpmPatchPolicy } from './pnpm-policy.js';
import { writeFile } from './util.js';

const coordinate = 'braces@3.0.3';
const relativePatch = 'patches/braces@3.0.3.patch';
const lockMaximum = 16 * 1024 * 1024;
const policyMaximum = 2 * 1024 * 1024;
const patchMaximum = 256 * 1024;

function patchAttributes(source: string): string {
  const rules = [
    '/patches/braces@3.0.3.patch text eol=lf -whitespace',
    '/patches/LICENSE.braces text eol=lf',
  ];
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
export function configureBracesPatch(root: string): boolean {
  root = realpathSync(root);
  const lock = readBoundedFile(path.join(root, 'pnpm-lock.yaml'), lockMaximum).toString('utf8');
  if (!/^  ['"]?braces@3\.0\.3(?:\([^'"\r\n]*\))?['"]?:[ \t]*(?:\r?\n|$)/m.test(lock)) return false;
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
  const after = pnpmPatchPolicy(before, coordinate, relativePatch);
  const attributesFile = path.join(root, '.gitattributes');
  const attributesStat = lstatSync(attributesFile, { throwIfNoEntry: false });
  const attributesBefore = attributesStat
    ? readBoundedFile(attributesFile, policyMaximum).toString('utf8')
    : '';
  const attributesAfter = patchAttributes(attributesBefore);
  const directory = path.join(root, 'patches');
  const directoryStat = lstatSync(directory, { throwIfNoEntry: false });
  if (directoryStat && (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()))
    throw new Error('Patch directory must be a real directory inside the project.');
  const artifacts = [
    { name: 'braces@3.0.3.patch', label: 'patch' },
    { name: 'LICENSE.braces', label: 'license notice' },
  ].map(({ name, label }) => ({
    target: path.join(directory, name),
    label,
    bytes: readBoundedFile(
      fileURLToPath(new URL(`../assets/patches/${name}`, import.meta.url)),
      patchMaximum,
    ),
  }));
  const missing: typeof artifacts = [];
  // Validate both destinations before writing either artifact or the YAML map.
  for (const artifact of artifacts) {
    if (lstatSync(artifact.target, { throwIfNoEntry: false })) {
      if (!readBoundedFile(artifact.target, patchMaximum).equals(artifact.bytes))
        throw new Error(
          `The braces ${artifact.label} path already contains different customer content.`,
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
