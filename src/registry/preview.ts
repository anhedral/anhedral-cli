import path from 'node:path';
import { existsSync } from 'node:fs';
import { readBoundedFile } from '../bounded-file.js';

const MAX_PREVIEW_FILE_BYTES = 256 * 1024;
export const MAX_PREVIEW_TOTAL_BYTES = 1024 * 1024;
export interface SourcePreview {
  path: string;
  content?: string;
  diff?: string;
  unavailable?: string;
}

export function validatePreviewPath(file: string): void {
  if (
    !file ||
    path.posix.isAbsolute(file) ||
    file.includes('\\') ||
    /[\x00-\x1f\x7f]/.test(file) ||
    file
      .split('/')
      .some(
        (part) =>
          !part ||
          ['.', '..', '.anhedral'].includes(part) ||
          (/^(?:\.env|\.dev\.vars)(?:\.|$)/.test(part) && !part.endsWith('.example')),
      )
  )
    throw new Error(
      'Select a relative generated source path; private environment and state files cannot be previewed.',
    );
}

/** A single contextual hunk is linear in file size and remains an applicable unified patch. */
export function sourceDiff(file: string, before: string | undefined, after: string): string {
  const lines = (content: string) =>
    content === '' ? [] : content.split('\n').slice(0, content.endsWith('\n') ? -1 : undefined);
  const oldLines = lines(before ?? '');
  const newLines = lines(after);
  if (before === after) return '';
  let prefix = 0;
  while (
    prefix < oldLines.length &&
    prefix < newLines.length &&
    oldLines[prefix] === newLines[prefix]
  )
    prefix++;
  // Newline-only changes must still include the final line in the patch.
  if (prefix && oldLines.length === newLines.length && prefix === oldLines.length) prefix--;
  let suffix = 0;
  while (
    (before ?? '').endsWith('\n') === after.endsWith('\n') &&
    suffix < oldLines.length - prefix &&
    suffix < newLines.length - prefix &&
    oldLines.at(-suffix - 1) === newLines.at(-suffix - 1)
  )
    suffix++;
  const start = Math.max(0, prefix - 3);
  const oldEnd = Math.min(oldLines.length, oldLines.length - suffix + 3);
  const newEnd = Math.min(newLines.length, newLines.length - suffix + 3);
  const output = [
    `diff --git a/${file} b/${file}`,
    ...(before === undefined ? ['new file mode 100644'] : []),
    `--- ${before === undefined ? '/dev/null' : `a/${file}`}`,
    `+++ b/${file}`,
    `@@ -${oldEnd - start ? start + 1 : start},${oldEnd - start} +${newEnd - start ? start + 1 : start},${newEnd - start} @@`,
  ];
  if (before === undefined && !after) return output.slice(0, 2).join('\n') + '\n';
  const append = (prefix: string, line: string, last: boolean, content: string) => {
    output.push(`${prefix}${line}`);
    if (last && !content.endsWith('\n')) output.push('\\ No newline at end of file');
  };
  for (let index = start; index < prefix; index++) output.push(` ${oldLines[index]}`);
  for (let index = prefix; index < oldLines.length - suffix; index++)
    append('-', oldLines[index], index === oldLines.length - 1, before ?? '');
  for (let index = prefix; index < newLines.length - suffix; index++)
    append('+', newLines[index], index === newLines.length - 1, after);
  for (let index = oldLines.length - suffix; index < oldEnd; index++)
    append(' ', oldLines[index], index === oldLines.length - 1, after);
  return output.join('\n') + '\n';
}

export function sourcePreview(
  root: string,
  stage: string,
  file: string,
  mode: 'diff' | 'view',
): SourcePreview {
  validatePreviewPath(file);
  const decode = (directory: string) =>
    new TextDecoder('utf-8', { fatal: true }).decode(
      readBoundedFile(path.join(directory, file), MAX_PREVIEW_FILE_BYTES),
    );
  let after: string;
  let before: string | undefined;
  try {
    after = decode(stage);
    if (after.includes('\x00')) throw new Error('Binary file');
    if (mode === 'diff' && existsSync(path.join(root, file))) {
      before = decode(root);
      if (before.includes('\x00')) throw new Error('Binary file');
    }
  } catch {
    return {
      path: file,
      unavailable:
        'Binary, nonregular or oversized file; source preview is unavailable (256 KiB limit).',
    };
  }
  return {
    path: file,
    ...(mode === 'view' ? { content: after } : { diff: sourceDiff(file, before, after) }),
  };
}
