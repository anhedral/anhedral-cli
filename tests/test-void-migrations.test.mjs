import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { prepareVoidMigrations } from '../dist/void-migrations.js';

function fixture() {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-void-migrations-'));
  const app = path.join(root, 'apps/api');
  const source = path.join(root, 'packages/db/drizzle');
  mkdirSync(app, { recursive: true });
  mkdirSync(path.join(source, 'meta'), { recursive: true });
  writeFileSync(
    path.join(source, '0000_initial.sql'),
    'CREATE TABLE items (id text PRIMARY KEY);\n',
  );
  writeFileSync(
    path.join(source, 'meta/_journal.json'),
    JSON.stringify({ entries: [{ tag: '0000_initial' }] }),
  );
  const config = { d1_databases: [{ binding: 'DB', migrations_dir: '../../packages/db/drizzle' }] };
  const prepare = (value = config) => prepareVoidMigrations(root, app, value);
  return {
    root,
    app,
    source,
    prepare,
    close: () => rmSync(root, { recursive: true, force: true }),
  };
}

test('Void owner mirrors reviewed shared migration bytes and updates only an intact owned copy', () => {
  const f = fixture();
  try {
    f.prepare();
    const copy = path.join(f.app, 'db/migrations/0000_initial.sql');
    assert.equal(
      readFileSync(copy, 'utf8'),
      readFileSync(path.join(f.source, '0000_initial.sql'), 'utf8'),
    );
    assert.equal(existsSync(path.join(f.app, 'db/migrations/meta/_journal.json')), true);
    f.prepare();
    writeFileSync(
      path.join(f.source, '0001_next.sql'),
      'ALTER TABLE items ADD COLUMN name text;\n',
    );
    f.prepare();
    assert.equal(existsSync(path.join(f.app, 'db/migrations/0001_next.sql')), true);
    writeFileSync(copy, 'DROP TABLE items;');
    assert.throws(() => f.prepare(), /were edited/);
    assert.equal(readFileSync(copy, 'utf8'), 'DROP TABLE items;');
  } finally {
    f.close();
  }
});

test('Void consumers do not receive migration copies and relinquished owners remove only owned files', () => {
  const f = fixture();
  try {
    f.prepare({ d1_databases: [{ binding: 'DB' }] });
    assert.equal(existsSync(path.join(f.app, 'db/migrations')), false);
    f.prepare();
    f.prepare({ d1_databases: [{ binding: 'DB' }] });
    assert.equal(existsSync(path.join(f.app, 'db/migrations')), false);
    mkdirSync(path.join(f.app, 'db/migrations'), { recursive: true });
    writeFileSync(path.join(f.app, 'db/migrations/customer.sql'), 'select 1;');
    assert.throws(() => f.prepare(), /without Anhedral ownership/);
    assert.equal(existsSync(path.join(f.app, 'db/migrations/customer.sql')), true);
  } finally {
    f.close();
  }
});

test('Void migration preparation rejects redirected paths, symlinks and seed SQL', () => {
  const f = fixture();
  try {
    assert.throws(
      () => f.prepare({ d1_databases: [{ migrations_dir: '../../somewhere' }] }),
      /packages\/db\/drizzle/,
    );
    symlinkSync(path.join(f.source, '0000_initial.sql'), path.join(f.source, 'redirect.sql'));
    assert.throws(() => f.prepare(), /symlinks/);
    rmSync(path.join(f.source, 'redirect.sql'));
    writeFileSync(path.join(f.source, 'seed.sql'), 'select 1;');
    assert.throws(() => f.prepare(), /seed.sql/);
  } finally {
    f.close();
  }
});
