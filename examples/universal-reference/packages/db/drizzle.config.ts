import { fileURLToPath } from 'node:url';
import { relative } from 'node:path';
import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  dialect: 'sqlite',
  schema: fileURLToPath(new URL('./src/schema.ts', import.meta.url)),
  out: relative(process.cwd(), fileURLToPath(new URL('./drizzle/', import.meta.url))),
});
