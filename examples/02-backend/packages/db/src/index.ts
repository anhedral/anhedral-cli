import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

function database(client: ReturnType<typeof postgres>) {
  return drizzle(client, { schema });
}
export type Database = ReturnType<typeof database>;

// Worker requests own their sockets. Neon handles pooling at the pooled endpoint.
export async function withDatabase<T>(url: string, run: (db: Database) => Promise<T>) {
  if (!url) throw Error('Configure DATABASE_URL');
  const client = postgres(url, { max: 1, prepare: false, fetch_types: false });
  try {
    return await run(database(client));
  } finally {
    await client.end();
  }
}
