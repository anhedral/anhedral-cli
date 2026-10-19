import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

/** Actual SQLite SQL/Drizzle behavior; this is not a Cloudflare D1 emulator. */
export function sqliteD1(migrations) {
  const database = new DatabaseSync(':memory:');
  for (const file of readdirSync(migrations)
    .filter((file) => file.endsWith('.sql'))
    .sort())
    database.exec(readFileSync(path.join(migrations, file), 'utf8'));
  function prepare(sql, values = []) {
    function all() {
      const results = database.prepare(sql).all(...values);
      return {
        success: true,
        results,
        meta: { changes: Number(database.prepare('select changes() as count').get().count) },
      };
    }
    return {
      bind(...bound) {
        return prepare(sql, bound);
      },
      async all() {
        return all();
      },
      async first(column) {
        const row = database.prepare(sql).get(...values);
        return column ? (row?.[column] ?? null) : (row ?? null);
      },
      async raw() {
        const query = database.prepare(sql);
        query.setReturnArrays(true);
        return query.all(...values);
      },
      async run() {
        const result = database.prepare(sql).run(...values);
        return {
          success: true,
          results: [],
          meta: { changes: Number(result.changes), last_row_id: Number(result.lastInsertRowid) },
        };
      },
    };
  }
  return {
    database,
    binding: {
      prepare,
      async batch(statements) {
        database.exec('BEGIN');
        try {
          const results = [];
          for (const statement of statements) results.push(await statement.all());
          database.exec('COMMIT');
          return results;
        } catch (error) {
          database.exec('ROLLBACK');
          throw error;
        }
      },
    },
    close() {
      database.close();
    },
  };
}
