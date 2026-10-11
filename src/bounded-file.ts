import { closeSync, constants, fstatSync, lstatSync, openSync, readSync } from 'node:fs';

/** Reject devices, links and oversized or growing files before parsing local input. */
export function readBoundedFile(filePath: string, maximumBytes: number): Buffer {
  const stat = lstatSync(filePath);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error(`Input file must be a regular file: ${filePath}`);
  const descriptor = openSync(
    filePath,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0),
  );
  try {
    const opened = fstatSync(descriptor);
    if (!opened.isFile()) throw new Error(`Input file must be a regular file: ${filePath}`);
    if (opened.size > maximumBytes) throw new Error(`Input file exceeds size limit: ${filePath}`);
    const chunks: Buffer[] = [];
    let total = 0;
    for (;;) {
      const chunk = Buffer.alloc(Math.min(8192, maximumBytes + 1 - total));
      const length = readSync(descriptor, chunk, 0, chunk.length, null);
      if (!length) return Buffer.concat(chunks);
      total += length;
      if (total > maximumBytes) throw new Error(`Input file exceeds size limit: ${filePath}`);
      chunks.push(chunk.subarray(0, length));
    }
  } finally {
    closeSync(descriptor);
  }
}
