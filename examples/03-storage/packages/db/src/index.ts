import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';
export function createDatabase(binding: Parameters<typeof drizzle>[0]) { return drizzle(binding, { schema }); }
