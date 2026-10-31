import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { spawn, spawnSync } from 'node:child_process';
import { commandArguments, commandArgumentError } from './cli-arguments.js';
import { resolveCommand } from './command.js';
import { createReporter, type OutputOptions } from './cli-output.js';
import { UI_CATALOG, resolveUiItems, type UiPlatform } from './ui-catalog.js';
import { detectUiTargets, initializeUiMetadata, inspectUiTarget } from './ui-project.js';

export type UiRunner = (args: string[], cwd: string) => string | Promise<string>;
function runUpstream(args: string[], cwd: string): Promise<string> {
  const invocation = resolveCommand('pnpm', [
    'dlx',
    `shadcn@${UI_CATALOG.shadcnCliVersion}`,
    ...args,
  ]);
  return new Promise((resolve, reject) => {
    const child = spawn(invocation.command, invocation.args, {
      cwd,
      shell: false,
      detached: process.platform !== 'win32',
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, CI: '1', NO_COLOR: '1' },
    });
    let stdout = '',
      stderr = '',
      answered = 0,
      bytes = 0;
    const fail = (reason: string) => {
      clearTimeout(timer);
      if (child.pid) {
        if (process.platform === 'win32')
          spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
            shell: false,
            stdio: 'ignore',
            windowsHide: true,
            timeout: 5000,
          });
        else {
          try {
            process.kill(-child.pid, 'SIGKILL');
          } catch {
            child.kill();
          }
        }
      }
      reject(Error(`Upstream UI command failed in ${cwd}: ${reason}`));
    };
    const timer = setTimeout(
      () => fail('installer timed out; inspect consumer changes before retrying'),
      120000,
    );
    child.stdin.on('error', () => {
      /* Process exit can close stdin before its final answer. */
    });
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    const receive = (chunk: string, stream: 'stdout' | 'stderr') => {
      bytes += Buffer.byteLength(chunk);
      if (bytes > 4 * 1024 * 1024) return fail('installer output exceeded its bound');
      if (stream === 'stdout') stdout += chunk;
      else stderr += chunk;
      // shadcn --yes skips confirmation, not overwrite prompts. Reply to each
      // pinned CLI prompt when it appears; prefeeding stdin loses later answers.
      const visible = stripVTControlCharacters(stdout + stderr);
      const prompts = visible.match(/› \(y\/N\)/g)?.length ?? 0;
      while (answered < prompts) {
        answered++;
        child.stdin.write('n\r');
      }
      // prompts retains a stdin listener after confirmations. Close input only
      // after the pinned installer reports its completed file operations.
      if (answered && /(?:Created|Updated|Skipped) \d+ files?\b/.test(visible)) child.stdin.end();
    };
    child.stdout.on('data', (chunk: string) => receive(chunk, 'stdout'));
    child.stderr.on('data', (chunk: string) => receive(chunk, 'stderr'));
    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', (status) => {
      clearTimeout(timer);
      if (status !== 0)
        reject(
          Error(
            `Upstream UI command failed in ${cwd}: ${stderr.slice(-2000) || 'check the project configuration'}`,
          ),
        );
      else resolve(stdout);
    });
  });
}

export async function runUiCommand(
  args: string[],
  output: OutputOptions,
  run: UiRunner = runUpstream,
) {
  const parsed = commandArguments('ui', args);
  const [action, ...names] = parsed.positional;
  if (!['init', 'add', 'list', 'diff', 'doctor'].includes(action))
    throw commandArgumentError('ui', 'Choose ui init, add, list, diff or doctor.');
  if (['add', 'diff'].includes(action) ? !names.length || names.length > 50 : names.length > 0)
    throw commandArgumentError('ui', 'Supply component names only for add/diff (at most 50).');
  const selectors = ['--web', '--native', '--all'].filter((flag) => parsed.has(flag));
  if (selectors.length > 1)
    throw commandArgumentError('ui', 'Choose one of --web, --native or --all.');
  const selector = selectors[0]?.slice(2) as UiPlatform | 'all' | undefined;
  let result: unknown;
  if (action === 'list') {
    result = {
      catalogRevision: UI_CATALOG.revision,
      nativeStyling: UI_CATALOG.nativeStyling,
      components: UI_CATALOG.components.filter(
        (item) => !selector || selector === 'all' || item[selector],
      ),
    };
  } else {
    const targets = detectUiTargets(process.cwd(), selector);
    if (action === 'doctor') {
      const reports = targets.map(inspectUiTarget);
      result = {
        targets: reports,
        configurationReady: reports.every((report) => report.configurationReady),
      };
      if (!reports.every((report) => report.configurationReady)) process.exitCode = 1;
    } else {
      // Preflight every target before invoking any installer, including explicit --all.
      const plans = targets.map((target) => {
        const report = inspectUiTarget(target);
        const configExists = existsSync(path.join(target.root, 'components.json'));
        const nativeInit = action === 'init' && target.platform === 'native';
        const issues = nativeInit
          ? report.issues.filter((issue) => !issue.startsWith('Missing components.json'))
          : report.issues;
        if ((action !== 'init' || target.platform === 'native' || configExists) && issues.length)
          throw Error(issues.join('\n') + '\n' + report.guide);
        if (nativeInit && !configExists && !existsSync(path.join(target.root, 'global.css')))
          throw Error(
            'Native init needs the upstream NativeWind global.css. Complete the RNR setup first.',
          );
        const items = action === 'init' ? [] : resolveUiItems(names, target.platform);
        return {
          root: target.root,
          platform: target.platform,
          items,
          nativeInit,
          command:
            action === 'init'
              ? configExists || nativeInit
                ? []
                : ['init', '--base', 'base', '--defaults', '--no-reinstall', '--no-monorepo']
              : [
                  'add',
                  ...items.map((item) => item.item),
                  '--yes',
                  ...(action === 'diff' ? ['--diff'] : []),
                ],
        };
      });
      if (!parsed.has('--dry-run')) {
        for (const plan of plans) {
          if (plan.nativeInit && !existsSync(path.join(plan.root, 'components.json'))) {
            if (!existsSync(path.join(plan.root, 'global.css')))
              throw Error(
                'Native init needs the upstream NativeWind global.css. Complete the RNR setup first.',
              );
            writeFileSync(
              path.join(plan.root, 'components.json'),
              JSON.stringify(
                {
                  $schema: 'https://ui.shadcn.com/schema.json',
                  style: 'new-york',
                  rsc: false,
                  tsx: true,
                  tailwind: {
                    config: 'tailwind.config.js',
                    css: 'global.css',
                    baseColor: 'neutral',
                    cssVariables: true,
                  },
                  aliases: {
                    components: '@/components',
                    ui: '@/components/ui',
                    utils: '@/lib/utils',
                    lib: '@/lib',
                    hooks: '@/hooks',
                  },
                },
                null,
                2,
              ) + '\n',
              { flag: 'wx' },
            );
          }
          const vendorOutput = plan.command.length ? await run(plan.command, plan.root) : '';
          if (action === 'init' || action === 'add') initializeUiMetadata(plan.root, plan.platform);
          Object.assign(plan, { output: vendorOutput });
        }
      }
      result = {
        action,
        dryRun: parsed.has('--dry-run'),
        installer: `shadcn@${UI_CATALOG.shadcnCliVersion}`,
        targets: plans,
      };
    }
  }
  createReporter(output, () =>
    action === 'list'
      ? UI_CATALOG.components
          .filter((item) => !selector || selector === 'all' || item[selector])
          .map(
            (item) =>
              `${item.name}\tweb: ${item.web ? 'shadcn' : 'unavailable'}\tnative: ${item.native ? 'RNR (validation required)' : 'unavailable'}`,
          )
          .join('\n')
      : action === 'doctor'
        ? (result as { targets: ReturnType<typeof inspectUiTarget>[] }).targets
            .map((report) =>
              [
                `${report.platform}: ${report.configurationReady ? 'configuration ready' : 'setup needed'} (${report.root})`,
                ...report.issues,
                'Runtime acceptance: not evaluated.',
              ].join('\n'),
            )
            .join('\n\n')
        : (
            result as {
              targets: { root: string; platform: string; command: string[]; output?: string }[];
            }
          ).targets
            .map((target) =>
              [
                `${action}${parsed.has('--dry-run') ? ' (dry run)' : ''}: ${target.platform} (${target.root})`,
                ...(parsed.has('--dry-run')
                  ? [
                      target.command.length
                        ? `shadcn@${UI_CATALOG.shadcnCliVersion} ${target.command.join(' ')}`
                        : 'Validate existing configuration; initialize metadata and attribution if absent.',
                    ]
                  : []),
                target.output?.trim() ?? '',
              ]
                .filter(Boolean)
                .join('\n'),
            )
            .join('\n\n'),
  ).result(result);
}
