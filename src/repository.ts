import { realpathSync } from 'node:fs';
import { defaultRunner, withApplicationLock, type DeliveryRunner } from './project-state.js';

interface Repository {
  repoId: number;
  nameWithOwner: string;
  url: string;
  isPrivate: boolean;
  viewerPermission: string;
  owner: { login: string };
}
function environment(): NodeJS.ProcessEnv {
  if (process.env.GH_HOST && process.env.GH_HOST !== 'github.com')
    throw new Error(
      'Repository automation supports github.com; reconcile the selected GitHub host explicitly.',
    );
  return {
    ...process.env,
    GH_HOST: 'github.com',
    GH_PROMPT_DISABLED: '1',
    GIT_TERMINAL_PROMPT: '0',
  };
}
function identity(remote: string): string {
  const match =
    /^(?:https:\/\/github\.com\/|git@github\.com:)([a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+?)(?:\.git)?$/.exec(
      remote,
    );
  if (!match || match[1].endsWith('/.') || match[1].endsWith('/..'))
    throw new Error('Origin must identify one GitHub repository without embedded credentials.');
  return match[1];
}
async function ownCheckout(root: string, run: DeliveryRunner): Promise<void> {
  if (
    realpathSync(
      (await run('git', ['rev-parse', '--show-toplevel'], root, environment())).trim(),
    ) !== root
  )
    throw new Error(
      'Initialize the app in its own Git repository; do not use a parent repository.',
    );
}
export async function githubRepository(root: string, run = defaultRunner): Promise<Repository> {
  root = realpathSync(root);
  await ownCheckout(root, run);
  const remotes = (await run('git', ['remote', 'get-url', '--all', 'origin'], root, environment()))
    .trim()
    .split(/\r?\n/);
  const pushes = (
    await run('git', ['remote', 'get-url', '--push', '--all', 'origin'], root, environment())
  )
    .trim()
    .split(/\r?\n/);
  if (remotes.length !== 1 || pushes.length !== 1 || identity(remotes[0]) !== identity(pushes[0]))
    throw new Error('Reconcile ambiguous or mismatched GitHub fetch/push origins.');
  const name = identity(remotes[0]);
  const repository = JSON.parse(
    await run(
      'gh',
      ['repo', 'view', name, '--json', 'nameWithOwner,url,isPrivate,viewerPermission,owner'],
      root,
      environment(),
    ),
  ) as Repository;
  if (
    repository.nameWithOwner?.toLowerCase() !== name.toLowerCase() ||
    repository.url?.toLowerCase() !== `https://github.com/${name}`.toLowerCase() ||
    repository.owner?.login?.toLowerCase() !== name.split('/')[0].toLowerCase() ||
    !['ADMIN', 'MAINTAIN', 'WRITE'].includes(repository.viewerPermission) ||
    typeof repository.isPrivate !== 'boolean'
  )
    throw new Error('GitHub did not verify the selected repository identity and write access.');
  repository.repoId = JSON.parse(
    await run('gh', ['api', `repos/${name}`, '--jq', '.id'], root, environment()),
  );
  if (!Number.isSafeInteger(repository.repoId) || repository.repoId <= 0)
    throw new Error('GitHub did not return a stable repository ID.');
  return repository;
}
export async function setupRepository(
  root: string,
  options: { owner?: string; name?: string; create?: boolean; visibility: 'private' | 'public' },
  run = defaultRunner,
) {
  root = realpathSync(root);
  return withApplicationLock(root, async () => {
    await ownCheckout(root, run);
    if ((await run('git', ['status', '--porcelain'], root, environment())).trim())
      throw new Error(
        'Review files and commit the application before repository setup; secrets must remain ignored.',
      );
    const commit = (await run('git', ['rev-parse', 'HEAD'], root, environment())).trim();
    if (!/^[a-f0-9]{40,64}$/.test(commit))
      throw new Error('Create a reviewed initial source commit first.');
    const user = JSON.parse(await run('gh', ['api', 'user'], root, environment()));
    const owner = options.owner ?? user.login;
    const name = options.name ?? root.split('/').at(-1)!;
    if (
      !/^[a-zA-Z0-9-]+$/.test(owner ?? '') ||
      !/^[a-zA-Z0-9_.-]+$/.test(name) ||
      ['.', '..'].includes(name)
    )
      throw new Error('Select a valid GitHub account and repository name.');
    const remotes = (await run('git', ['remote'], root, environment())).trim().split(/\r?\n/);
    if (!remotes.includes('origin')) {
      if (!options.create)
        throw new Error('No origin: use --create for an authorized new GitHub repository.');
      await run(
        'gh',
        [
          'repo',
          'create',
          `${owner}/${name}`,
          `--${options.visibility}`,
          '--source',
          '.',
          '--remote',
          'origin',
        ],
        root,
        environment(),
      );
    }
    const repository = await githubRepository(root, run);
    if (
      repository.nameWithOwner.toLowerCase() !== `${owner}/${name}`.toLowerCase() ||
      repository.isPrivate !== (options.visibility === 'private')
    )
      throw new Error(
        'Existing repository ownership/name/visibility differs; origin and visibility were not replaced.',
      );
    if (
      (await run('git', ['status', '--porcelain'], root, environment())).trim() ||
      (await run('git', ['rev-parse', 'HEAD'], root, environment())).trim() !== commit
    )
      throw new Error('Source changed during repository setup; nothing was pushed.');
    const branch = (
      await run('git', ['symbolic-ref', '--short', 'HEAD'], root, environment())
    ).trim();
    if (!branch || branch.startsWith('-'))
      throw new Error('Select the intended source branch before pushing.');
    await run(
      'git',
      ['push', '--set-upstream', 'origin', `HEAD:refs/heads/${branch}`],
      root,
      environment(),
    );
    const remote = (
      await run(
        'git',
        ['ls-remote', '--heads', 'origin', `refs/heads/${branch}`],
        root,
        environment(),
      )
    )
      .trim()
      .split(/\s+/);
    if (remote[0] !== commit || remote[1] !== `refs/heads/${branch}`)
      throw new Error('GitHub did not confirm the pushed source commit.');
    return { repository, branch, commit, ownership: 'customer' };
  });
}
