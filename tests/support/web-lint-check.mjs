import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

/** Exercise installed app-local rules, not just generated config text. */
export async function verifyWebLint(root) {
  const cwd = path.join(root, 'apps/web');
  const require = createRequire(path.join(cwd, 'package.json'));
  const { ESLint } = require('eslint');
  const plugin = require('@next/eslint-plugin-next');
  const eslint = new ESLint({ cwd });
  const [result] = await eslint.lintText(
    "import { useState } from 'react'; export default function Page({ active }: { active: boolean }) { if (active) useState(0); return <img src='/logo.png' alt='Logo'/>; }",
    { filePath: 'app/lint-probe.tsx' },
  );
  assert.equal(
    result.messages.some((entry) => entry.fatal),
    false,
    JSON.stringify(result.messages),
  );
  for (const rule of ['@next/next/no-img-element', 'react-hooks/rules-of-hooks'])
    assert.ok(
      result.messages.some((entry) => entry.ruleId === rule),
      JSON.stringify(result.messages),
    );
  const config = await eslint.calculateConfigForFile(path.join(cwd, 'app/lint-probe.tsx'));
  for (const [rule, level] of Object.entries({
    ...plugin.configs.recommended.rules,
    ...plugin.configs['core-web-vitals'].rules,
  })) {
    const expected = Array.isArray(level) ? level[0] : level;
    assert.equal(
      config.rules[rule][0],
      typeof expected === 'string' ? { off: 0, warn: 1, error: 2 }[expected] : expected,
      rule,
    );
  }
  console.log('Installed web lint rules preserve TypeScript, Next API and React Hooks checks');
}
