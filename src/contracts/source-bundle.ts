import {
  SOURCE_LIMITS,
  sourceContainsCredential,
  uploadExcluded,
  uploadSecret,
} from "./cli-transport.ts";
import {
  excludedSource as excluded,
  generatedSource as generated,
  INVENTORY_PROFILE,
  secretSource as secret,
} from "./source-profile.ts";

const digest = async (value: Uint8Array | string) => {
  const bytes =
    typeof value === "string" ? new TextEncoder().encode(value) : Uint8Array.from(value);
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
};
export async function readSourceBounded(body: ReadableStream<Uint8Array> | null, maximum: number) {
  if (!body) throw new Error("Response body is missing.");
  const reader = body.getReader(),
    chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maximum) {
        await reader.cancel();
        throw new Error("Response exceeds its storage limit.");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}
const executableModes = new WeakMap<Map<string, Uint8Array>, Map<string, boolean>>();
const decoder = new TextDecoder("utf-8", { fatal: true });
export function sourceExecutable(files: Map<string, Uint8Array>, path: string) {
  return executableModes.get(files)?.get(path) ?? false;
}
export function validateSourcePath(path: string) {
  if (
    !path ||
    path.length > 240 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    path.includes("\0") ||
    path.split("/").some((p) => !p || p === "." || p === "..") ||
    excluded.test(path) ||
    generated.test(path) ||
    secret.test(path)
  )
    throw Error("Choose a regular authored source file.");
  return path;
}
export async function sourceInventory(files: Map<string, Uint8Array>) {
  let total = 0;
  if (files.size > SOURCE_LIMITS.files) throw Error("Source file count exceeded.");
  const entries = [];
  for (const [path, bytes] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    validateSourcePath(path);
    total += bytes.length;
    if (total > SOURCE_LIMITS.bytes) throw Error("Source byte limit exceeded.");
    entries.push({
      path,
      size: bytes.length,
      executable: sourceExecutable(files, path),
      digest: await digest(bytes),
    });
  }
  const manifest = JSON.stringify({ schemaVersion: 2, profile: INVENTORY_PROFILE, entries });
  return { manifest, digest: await digest(manifest) };
}
export async function packSource(files: Map<string, Uint8Array>) {
  await sourceInventory(files);
  const blocks: Uint8Array[] = [];
  const encode = new TextEncoder();
  const add = (name: string, bytes: Uint8Array, mode: number, kind = "0") => {
    const header = new Uint8Array(512);
    const put = (offset: number, text: string) => header.set(encode.encode(text), offset);
    put(0, name);
    put(100, mode.toString(8).padStart(7, "0") + "\0");
    put(108, "0000000\0");
    put(116, "0000000\0");
    put(124, bytes.length.toString(8).padStart(11, "0") + "\0");
    put(136, "00000000000\0");
    header.fill(32, 148, 156);
    put(156, kind);
    put(257, "ustar\0");
    put(263, "00");
    const sum = header.reduce((a, b) => a + b, 0);
    put(148, sum.toString(8).padStart(6, "0") + "\0 ");
    blocks.push(header, bytes, new Uint8Array((512 - (bytes.length % 512)) % 512));
  };
  for (const [path, bytes] of [...files].sort(([a], [b]) => a.localeCompare(b))) {
    const name = `./${path}`;
    if (encode.encode(name).length > 100) {
      add("././@LongLink", encode.encode(name + "\0"), 0o644, "L");
      add("long-source-name", bytes, sourceExecutable(files, path) ? 0o755 : 0o644);
    } else add(name, bytes, sourceExecutable(files, path) ? 0o755 : 0o644);
  }
  blocks.push(new Uint8Array(1024));
  const stream = new Blob(blocks.map((bytes) => Uint8Array.from(bytes).buffer))
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return readSourceBounded(stream, SOURCE_LIMITS.bytes);
}
export async function unpackSource(compressed: Uint8Array, strict = false) {
  const stream = new Blob([Uint8Array.from(compressed).buffer])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  const bytes = await readSourceBounded(stream, SOURCE_LIMITS.archiveBytes),
    files = new Map<string, Uint8Array>(),
    modes = new Map<string, boolean>();
  let terminated = false;
  const str = (offset: number, length: number) =>
    decoder.decode(bytes.subarray(offset, offset + length)).split("\0")[0]!;
  let count = 0,
    total = 0,
    longName: string | null = null;
  for (let offset = 0; offset + 512 <= bytes.length; ) {
    if (bytes.subarray(offset, offset + 512).every((v) => v === 0)) {
      terminated = true;
      if (strict && bytes.subarray(offset).some((v) => v !== 0))
        throw Error("Trailing archive data.");
      break;
    }
    if (++count > 10000) throw new Error("Archive member count exceeded.");
    const checksum = parseInt(str(offset + 148, 8).trim() || "0", 8);
    let actual = 0;
    for (let i = 0; i < 512; i++) actual += i >= 148 && i < 156 ? 32 : bytes[offset + i]!;
    if (actual !== checksum) throw new Error("Source archive checksum failed.");
    const size = parseInt(str(offset + 124, 12).trim() || "0", 8),
      executable = Boolean(parseInt(str(offset + 100, 8).trim() || "0", 8) & 0o111),
      kind = str(offset + 156, 1),
      prefix = str(offset + 345, 155);
    if (!Number.isSafeInteger(size) || size < 0 || offset + 512 + size > bytes.length)
      throw new Error("Invalid archive member size.");
    const content = bytes.subarray(offset + 512, offset + 512 + size);
    let name = longName ?? [prefix, str(offset, 100)].filter(Boolean).join("/");
    longName = null;
    offset += 512 + Math.ceil(size / 512) * 512;
    if (kind === "L") {
      longName = decoder.decode(content).split("\0")[0]!;
      continue;
    }
    if (kind === "x" || kind === "g")
      throw new Error("PAX archives are outside the pinned source format.");
    name = name.replace(/^(?:\.\/)+/, "").replace(/\/$/, "");
    if (!name || name === ".") continue;
    if (
      name.startsWith("/") ||
      name.includes("\\") ||
      name.includes("\0") ||
      name.split("/").some((p) => p === ".." || !p)
    )
      throw new Error("Unsafe archive path.");
    if (secret.test(name)) throw new Error("Forbidden source secret.");
    if (excluded.test(name) || generated.test(name)) {
      if (strict) throw Error("Excluded archive member.");
      continue;
    }
    if (
      strict &&
      (name.length > 240 ||
        /[\x00-\x1f\x7f]/.test(name) ||
        uploadExcluded.test(name) ||
        uploadSecret.test(name))
    )
      throw Error("Forbidden upload member.");
    if (kind === "5") continue;
    if (kind !== "" && kind !== "0") throw new Error("Only regular source files are allowed.");
    if (
      files.has(name) ||
      files.size >= SOURCE_LIMITS.files ||
      (total += size) > SOURCE_LIMITS.bytes
    )
      throw new Error("Source inventory exceeds limits or duplicates a path.");
    if (strict && sourceContainsCredential(content))
      throw Error("Credential material is forbidden in source uploads.");
    files.set(name, content);
    modes.set(name, executable);
  }
  if (strict && (!terminated || longName !== null)) throw Error("Incomplete source archive.");
  executableModes.set(files, modes);
  return files;
}
export function setSourceExecutable(
  files: Map<string, Uint8Array>,
  path: string,
  executable: boolean,
) {
  let modes = executableModes.get(files);
  if (!modes) executableModes.set(files, (modes = new Map()));
  modes.set(path, executable);
}
