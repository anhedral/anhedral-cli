import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
let DatabaseSync;
try {
  ({ DatabaseSync } = await import('node:sqlite'));
} catch {}
test(
  'private event-feed retention is bounded and owner-scoped, with explicit replay gaps and uncertainty preserved',
  { skip: !DatabaseSync && 'SQLite acceptance requires Node 22.13+ or 24+' },
  () => {
    const db = new DatabaseSync(':memory:');
    try {
      db.exec(
        'CREATE TABLE application_event(id TEXT PRIMARY KEY,user_id TEXT,created_at INTEGER); CREATE TABLE ai_usage(id TEXT PRIMARY KEY,count INTEGER); CREATE TABLE rtc_session(id TEXT PRIMARY KEY,user_id TEXT,created_at INTEGER);',
      );
      const insert = db.prepare('INSERT INTO application_event VALUES(?,?,?)');
      for (let i = 0; i < 150; i++) insert.run('old-' + i, 'owner', i);
      for (let i = 0; i < 20; i++) insert.run('live-' + i, 'owner', 1000 + i);
      for (let i = 0; i < 100; i++) insert.run('foreign-' + i, 'other', i);
      db.exec(
        "INSERT INTO ai_usage VALUES('owner:old-day',3);INSERT INTO rtc_session VALUES('uncertain-reservation','owner',0);",
      );
      const uncertain = JSON.stringify([
        db.prepare('SELECT * FROM ai_usage').all(),
        db.prepare('SELECT * FROM rtc_session').all(),
      ]);
      const cleanup = db.prepare(
        readFileSync(new URL('../assets/stack/event-retention.sql.txt', import.meta.url), 'utf8'),
      );
      assert.equal(cleanup.run('owner', 500).changes, 100);
      const earliest = db
        .prepare('SELECT MIN(created_at) AS earliest FROM application_event WHERE user_id=?')
        .get('owner').earliest;
      const requestedCursor = 0;
      const resume = requestedCursor < earliest ? { state: 'gap', earliest } : { state: 'resume' };
      assert.equal(resume.state, 'gap');
      assert.equal(earliest, 100);
      assert.equal(cleanup.run('owner', 500).changes, 50);
      assert.equal(cleanup.run('owner', 500).changes, 0);
      assert.equal(
        db.prepare('SELECT COUNT(*) AS count FROM application_event WHERE user_id=?').get('other')
          .count,
        100,
      );
      assert.equal(
        db.prepare('SELECT COUNT(*) AS count FROM application_event WHERE user_id=?').get('owner')
          .count,
        20,
      );
      assert.equal(
        JSON.stringify([
          db.prepare('SELECT * FROM ai_usage').all(),
          db.prepare('SELECT * FROM rtc_session').all(),
        ]),
        uncertain,
      );
    } finally {
      db.close();
    }
  },
);
