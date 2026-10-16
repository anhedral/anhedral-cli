import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { scaffoldStandardProject, parseStandardOptions } from '../dist/standard.js';
import { addStackItems } from '../dist/registry/add.js';
import { bootstrap } from './support/workspace-bootstrap.mjs';

const read = (root, file) => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
// Faithful upstream shadcn templates, including parser scope and only-warn behavior.
const base = `import { createRequire } from "node:module"
import babelParser from "@babel/eslint-parser"
import js from "@eslint/js"
import eslintConfigPrettier from "eslint-config-prettier"
import onlyWarn from "eslint-plugin-only-warn"
import turboPlugin from "eslint-plugin-turbo"

const require = createRequire(import.meta.url)

/**
 * A shared ESLint configuration for the repository.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  js.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: [require.resolve("@babel/preset-typescript")],
        },
      },
    },
    plugins: {
      turbo: turboPlugin,
    },
    rules: {
      "turbo/no-undeclared-env-vars": "warn",
    },
  },
  {
    plugins: {
      onlyWarn,
    },
  },
  {
    ignores: ["dist/**"],
  },
]
`;
const react = `import pluginReactHooks from "eslint-plugin-react-hooks"
import globals from "globals"

import { config as baseConfig } from "./base.js"

/**
 * A custom ESLint configuration for libraries that use React.
 *
 * @type {import("eslint").Linter.Config[]}
 */
export const config = [
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
  },
  pluginReactHooks.configs.flat.recommended,
]
`;

function runner(_command, args, cwd) {
  if (args[0] === 'dlx') {
    const root = path.join(args[args.indexOf('--cwd') + 1], args[args.indexOf('--name') + 1]);
    bootstrap(root);
    const directory = path.join(root, 'packages/eslint-config');
    writeFileSync(
      path.join(directory, 'package.json'),
      JSON.stringify({
        name: '@workspace/eslint-config',
        private: true,
        type: 'module',
        exports: {
          './base': './base.js',
          './react-internal': './react-internal.js',
          './next-js': './next.js',
        },
        devDependencies: {
          '@next/eslint-plugin-next': '^16.4.0',
          'eslint-plugin-react-hooks': '7.1.1',
        },
      }),
    );
    writeFileSync(path.join(directory, 'base.js'), base);
    writeFileSync(path.join(directory, 'react-internal.js'), react);
    writeFileSync(path.join(directory, 'next.js'), 'export const nextJsConfig = [];\n');
  } else if (args.includes('--lockfile-only'))
    writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n');
  else throw new Error(`Unexpected command: ${args}`);
}
async function scaffold(root, flags) {
  const log = console.log;
  console.log = () => {};
  try {
    await scaffoldStandardProject(
      parseStandardOptions('new', [root, '--skip-install', '--no-git', '--json', ...flags]),
      runner,
    );
  } finally {
    console.log = log;
  }
}

function assertShared(root) {
  const config = read(root, 'packages/eslint-config/package.json');
  assert.equal(config.devDependencies['@next/eslint-plugin-next'], undefined);
  assert.equal(config.devDependencies['eslint-plugin-react-hooks'], '7.1.1');
  assert.equal(config.exports['./next-js'], undefined);
  assert.equal(existsSync(path.join(root, 'packages/eslint-config/next.js')), false);
  assert.equal(readFileSync(path.join(root, 'packages/eslint-config/base.js'), 'utf8'), base);
  assert.equal(
    readFileSync(path.join(root, 'packages/eslint-config/react-internal.js'), 'utf8'),
    react,
  );
}
test('API-only projects remove inherited Next lint tooling and retain TypeScript/React lint foundations', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-lint-api-'));
  try {
    const root = path.join(temp, 'project');
    await scaffold(root, ['--hono']);
    assertShared(root);
    assert.equal(existsSync(path.join(root, 'apps/web')), false);
    assert.equal(
      read(root, 'apps/api/package.json').devDependencies['@next/eslint-plugin-next'],
      undefined,
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
for (const flags of [[], ['--next']])
  test(`${flags.length ? 'Next.js' : 'Vinext'} owns its pinned lint plugin independently of shared packages`, async () => {
    const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-lint-web-'));
    try {
      const root = path.join(temp, 'project');
      await scaffold(root, flags);
      assertShared(root);
      assert.equal(
        read(root, 'apps/web/package.json').devDependencies['@next/eslint-plugin-next'],
        '16.4.2',
      );
      assert.equal(
        read(root, 'packages/ui/package.json').devDependencies?.['@next/eslint-plugin-next'],
        undefined,
      );
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  });
test('adding web after an API-only bootstrap uses retained shared React lint without restoring global Next tooling', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-lint-add-'));
  try {
    const root = path.join(temp, 'project');
    await scaffold(root, ['--hono']);
    await addStackItems(root, { items: ['vinext'], skipInstall: true }, runner);
    assertShared(root);
    assert.equal(
      read(root, 'apps/web/package.json').devDependencies['@next/eslint-plugin-next'],
      '16.4.2',
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

const modules = process.env.ANHEDRAL_LINT_TEST_NODE_MODULES;
test(
  'real app-local Next and React Hooks rules retain Image, Link and hook violations while parsing TypeScript',
  {
    skip: !modules && 'Set ANHEDRAL_LINT_TEST_NODE_MODULES to installed pinned lint dependencies.',
  },
  async () => {
    const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-lint-runtime-'));
    try {
      const root = path.join(temp, 'project');
      await scaffold(root, []);
      const packages = [
        'eslint',
        '@next/eslint-plugin-next',
        '@typescript-eslint/parser',
        '@typescript-eslint/eslint-plugin',
        '@eslint/js',
        '@babel/eslint-parser',
        '@babel/preset-typescript',
        'eslint-plugin-react-hooks',
        'globals',
        'eslint-config-prettier',
        'eslint-plugin-only-warn',
        'eslint-plugin-turbo',
      ];
      for (const directory of ['apps/web', 'packages/eslint-config'])
        for (const name of packages) {
          const destination = path.join(root, directory, 'node_modules', name);
          mkdirSync(path.dirname(destination), { recursive: true });
          symlinkSync(path.join(modules, name), destination, 'dir');
        }
      const workspace = path.join(root, 'apps/web/node_modules/@workspace/eslint-config');
      mkdirSync(path.dirname(workspace), { recursive: true });
      symlinkSync(path.join(root, 'packages/eslint-config'), workspace, 'dir');
      writeFileSync(path.join(root, 'apps/web/next.config.js'), 'export default {};\n');
      const pages = path.join(root, 'apps/web/pages');
      mkdirSync(pages);
      writeFileSync(
        path.join(pages, 'about.tsx'),
        'export default function About() { return null; }',
      );
      const require = createRequire(path.join(modules, '_lint_probe.cjs'));
      const plugin = require('@next/eslint-plugin-next');
      assert.equal(require('@next/eslint-plugin-next/package.json').version, '16.4.2');
      const { ESLint } = require('eslint');
      const eslint = new ESLint({ cwd: path.join(root, 'apps/web') });
      const [result] = await eslint.lintText(
        "import { useState } from 'react'; export default function Page({ active }: { active: boolean }) { if (active) useState(0); return <><img src='/logo.png' alt='Logo'/><a href='/about'>About</a></>; }",
        { filePath: 'pages/index.tsx' },
      );
      assert.equal(
        result.messages.some((entry) => entry.fatal),
        false,
        JSON.stringify(result.messages),
      );
      for (const rule of [
        '@next/next/no-img-element',
        '@next/next/no-html-link-for-pages',
        'react-hooks/rules-of-hooks',
      ])
        assert.ok(
          result.messages.some((entry) => entry.ruleId === rule),
          `${rule}: ${JSON.stringify(result.messages)}`,
        );
      const [valid] = await eslint.lintText(
        "import type { NextConfig } from 'next'; import Child from './child'; const config: NextConfig = {}; export function Page() { return <Child/>; } export default config;",
        { filePath: 'app/valid-types.tsx' },
      );
      assert.equal(
        valid.messages.some(
          (entry) =>
            entry.ruleId === '@typescript-eslint/no-unused-vars' ||
            entry.ruleId === 'no-unused-vars',
        ),
        false,
        JSON.stringify(valid.messages),
      );
      const [unused] = await eslint.lintText(
        'const unused: number = 1; export default function Page() { return <main/>; }',
        { filePath: 'app/unused-types.tsx' },
      );
      assert.ok(
        unused.messages.some((entry) => entry.ruleId === '@typescript-eslint/no-unused-vars'),
        JSON.stringify(unused.messages),
      );
      const config = await eslint.calculateConfigForFile(path.join(pages, 'index.tsx'));
      for (const [rule, level] of Object.entries({
        ...plugin.configs.recommended.rules,
        ...plugin.configs['core-web-vitals'].rules,
      })) {
        const expected = Array.isArray(level) ? level[0] : level;
        assert.equal(
          config.rules[rule][0],
          typeof expected === 'string' ? { off: 0, warn: 1, error: 2 }[expected] : expected,
        );
      }
    } finally {
      rmSync(temp, { recursive: true, force: true });
    }
  },
);
