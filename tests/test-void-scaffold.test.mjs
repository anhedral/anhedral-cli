import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { refreshVoidEnvironment } from '../dist/scaffold/void.js';

test('Void capability additions preserve existing environment declarations and required runtime', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-void-env-'));
  const app = path.join(root, 'apps/api');
  mkdirSync(app, { recursive: true });
  try {
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ engines: { node: '>=22' } }));
    writeFileSync(path.join(app, 'void.config.ts'), 'export default {};\n');
    writeFileSync(
      path.join(app, 'env.ts'),
      "import { defineEnv } from 'void/env';\nexport default defineEnv({});\n",
    );
    writeFileSync(
      path.join(app, '.dev.vars.example'),
      'DATABASE_URL=\nVITE_ORIGIN=https://example.com\n',
    );
    refreshVoidEnvironment(root);
    const schema = readFileSync(path.join(app, 'env.ts'), 'utf8');
    assert.match(schema, /import \{[^}]*string[^}]*\} from 'void\/env'/);
    assert.equal(schema.split('DATABASE_URL:').length, 2);
    assert.doesNotMatch(schema, /VITE_ORIGIN:/);
    assert.equal(existsSync(path.join(app, '.dev.vars.example')), false);
    assert.match(readFileSync(path.join(app, 'env.example'), 'utf8'), /DATABASE_URL=/);
    refreshVoidEnvironment(root);
    assert.equal(readFileSync(path.join(app, 'env.ts'), 'utf8'), schema);
    assert.equal(
      JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).engines.node,
      '>=24.21.0',
    );
    writeFileSync(
      path.join(app, '.env.example'),
      'DATABASE_URL=do-not-replace\nSTRIPE_SECRET_KEY=\n',
    );
    refreshVoidEnvironment(root);
    assert.equal(existsSync(path.join(app, '.env.example')), false);
    const extended = readFileSync(path.join(app, 'env.ts'), 'utf8');
    assert.equal(extended.split('DATABASE_URL:').length, 2);
    assert.equal(extended.split('STRIPE_SECRET_KEY:').length, 2);
    assert.doesNotMatch(readFileSync(path.join(app, 'env.example'), 'utf8'), /do-not-replace/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
