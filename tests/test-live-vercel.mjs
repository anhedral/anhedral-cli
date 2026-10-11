// Opt-in live test: creates and deletes only its isolated Vercel project.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { parseStandardOptions, scaffoldStandardProject } from '../dist/standard.js';
import {
  connectVercelApplication,
  shipVercelApplication,
  verifyVercelApplication,
  rollbackVercelApplication,
  vercelApplicationStatus,
} from '../dist/vercel.js';
import { defaultRunner } from '../dist/project-state.js';
const scope = process.argv[2];
assert.match(scope ?? '', /^[a-zA-Z0-9_-]+$/);
assert.ok(process.argv.includes('--allow-provider-mutations'), 'Explicit opt-in required');
const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-vercel-live-'));
const root = path.join(temporary, `anhedral-qa-${randomBytes(5).toString('hex')}`);
let project;
const run = async (command, args, cwd, env) => {
  console.log('Live command', command, args.slice(0, 4).join(' '));
  return defaultRunner(command, args, cwd, env);
};
const put = (file, value) => {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, value);
};
const git = (...args) =>
  execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Anhedral QA',
      GIT_AUTHOR_EMAIL: ['qa', 'example.invalid'].join('@'),
      GIT_COMMITTER_NAME: 'Anhedral QA',
      GIT_COMMITTER_EMAIL: ['qa', 'example.invalid'].join('@'),
    },
  });
try {
  await scaffoldStandardProject(parseStandardOptions('new', [root, '--next', '--no-git']));
  put(
    'apps/web/app/page.tsx',
    `import Link from 'next/link';\nexport default function Page() { return <main><h1>Anhedral native Next.js QA</h1><Link href="/about">About this app</Link></main>; }\n`,
  );
  put(
    'apps/web/app/about/page.tsx',
    `export default function Page() { return <main><h1>Customer-owned Vercel delivery</h1></main>; }\n`,
  );
  put(
    'tests/live.mjs',
    `import assert from 'node:assert/strict';\nconst origin = process.env.ANHEDRAL_APP_URL;\nfor (const [pathname, text] of [['/', 'Anhedral native Next.js QA'], ['/about', 'Customer-owned Vercel delivery']]) { const response = await fetch(new URL(pathname, origin)); assert.equal(response.status, 200); assert.ok((await response.text()).includes(text)); }\n`,
  );
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  pkg.scripts['test:live'] = 'node tests/live.mjs';
  put('package.json', JSON.stringify(pkg, null, 2) + '\n');
  const connected = await connectVercelApplication(
    root,
    { scope, audience: 'public', use: 'personal', create: true },
    run,
  );
  project = connected.project;
  console.log('Connected isolated project', project.projectId);
  git('init');
  git('add', '.');
  git('commit', '-m', 'Validate native Next.js delivery');
  const first = await shipVercelApplication(root, run);
  console.log('Shipped', JSON.stringify(first.release));
  await verifyVercelApplication(root, run);
  put(
    'apps/web/app/about/page.tsx',
    `export default function Page() { return <main><h1>Customer-owned Vercel delivery</h1><p>Second checked release</p></main>; }\n`,
  );
  git('add', '.');
  git('commit', '-m', 'Validate second release');
  await shipVercelApplication(root, run);
  await verifyVercelApplication(root, run);
  await rollbackVercelApplication(root, first.release.id, true, run);
  git('checkout', first.release.commit);
  await verifyVercelApplication(root, run);
  assert.equal((await vercelApplicationStatus(root, true, run)).activeRecordedVersion, true);
  console.log(
    'Live native Vercel creation, two releases, product verification and rollback passed',
  );
} finally {
  // A creation receipt survives failures before connection completes.
  if (!project) {
    try {
      project = JSON.parse(readFileSync(path.join(root, '.anhedral/vercel-creation.json'), 'utf8'));
    } catch {}
  }
  if (project?.projectId && project?.teamId) {
    execFileSync(
      'pnpm',
      ['dlx', 'vercel@62.7.0', 'project', 'remove', path.basename(root), '--scope', project.teamId],
      { cwd: root, input: 'y\n', encoding: 'utf8', maxBuffer: 1024 * 1024 },
    );
    console.log('Deleted isolated Vercel project', project.projectId);
  }
  rmSync(temporary, { recursive: true, force: true });
}
