// SPDX-License-Identifier: Apache-2.0
import { environmentNameSchema } from "./environment-transport.ts";

/** Literal dotenv parsing only. Never evaluate a shell, interpolate variables,
 * or include input values in errors. The same parser serves browser and CLI. */
export function parseEnvironmentFile(input: string): { name: string; value: string }[] {
  if (input.includes("\0")) throw new Error("Environment files cannot contain NUL bytes.");
  if (new TextEncoder().encode(input).length > 65536)
    throw new Error("Environment files support at most 64 KiB.");
  const text = input.replace(/^\uFEFF/, "").replaceAll("\r\n", "\n");
  const entries: { name: string; value: string }[] = [];
  const names = new Set<string>();
  let position = 0,
    line = 1;
  const fail = (message: string): never => {
    throw new Error(`Line ${line}: ${message}`);
  };
  const space = () => {
    while (text[position] === " " || text[position] === "\t" || text[position] === "\r") position++;
  };
  while (position < text.length) {
    space();
    if (text[position] === "#")
      while (position < text.length && text[position] !== "\n") position++;
    if (text[position] === "\n") {
      position++;
      line++;
      continue;
    }
    if (position === text.length) break;
    if (text.slice(position, position + 7) === "export ") {
      position += 7;
      space();
    }
    const start = position;
    while (position < text.length && /[A-Za-z0-9_]/.test(text[position]!)) position++;
    const name = text.slice(start, position);
    if (!environmentNameSchema.safeParse(name).success) fail("Use an uppercase variable name.");
    if (names.has(name)) fail(`Duplicate variable ${name}.`);
    space();
    if (text[position] !== "=") fail(`Expected = after ${name}.`);
    position++;
    space();
    let value = "";
    const quote = text[position];
    if (quote === '"' || quote === "'") {
      position++;
      let closed = false;
      while (position < text.length) {
        const character = text[position++]!;
        if (character === quote) {
          closed = true;
          break;
        }
        if (character === "\n") line++;
        if (character === "\\" && quote === '"') {
          const escaped = text[position];
          const replacements: Record<string, string> = {
            n: "\n",
            r: "\r",
            t: "\t",
            "\\": "\\",
            '"': '"',
          };
          if (escaped !== undefined && Object.hasOwn(replacements, escaped)) {
            value += replacements[escaped];
            position++;
            continue;
          }
        }
        value += character;
      }
      if (!closed) fail(`Unclosed quoted value for ${name}.`);
      space();
      if (position < text.length && text[position] !== "#" && text[position] !== "\n")
        fail(`Unexpected text after ${name}.`);
    } else {
      const valueStart = position;
      while (position < text.length && text[position] !== "\n" && text[position] !== "#")
        position++;
      value = text.slice(valueStart, position).trimEnd();
    }
    if (value.length > 16384) fail(`Value for ${name} exceeds the supported size.`);
    names.add(name);
    entries.push({ name, value });
    if (entries.length > 128) fail("Imports support at most 128 variables.");
    if (text[position] === "#")
      while (position < text.length && text[position] !== "\n") position++;
    if (text[position] === "\n") {
      position++;
      line++;
    }
  }
  if (!entries.length) throw new Error("The environment file contains no variables.");
  return entries;
}

export function inferredEnvironmentKind(name: string): "config" | "secret" {
  return /^(NEXT_PUBLIC_|VITE_|PUBLIC_|EXPO_PUBLIC_)/.test(name) ? "config" : "secret";
}
