import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema.ts',
  out: './drizzle',
  ...(process.env.DATABASE_URL_UNPOOLED && {
    dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED },
  }),
});
