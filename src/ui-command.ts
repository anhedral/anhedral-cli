import { existsSync } from 'node:fs';
import { MAX_PROJECT_JSON_BYTES, readBoundedFile } from './bounded-file.js';
import path from 'node:path';
import { stripVTControlCharacters } from 'node:util';
import { spawn, spawnSync } from 'node:child_process';
import { commandArguments, commandArgumentError } from './cli-arguments.js';
import { resolveCommand } from './command.js';
import { ANHEDRAL_STACK } from './capability-catalog.js';
import { createReporter, type OutputOptions } from './cli-output.js';
import { UI_CATALOG, resolveUiItems } from './ui-catalog.js';
import {
  assertUiMetadataPaths,
  detectUiTargets,
  initializeUiMetadata,
  inspectUiTarget,
  type UiTarget,
} from './ui-project.js';
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
function assertAnhedralStackTarget(target: UiTarget): void {
  const dependencies = { ...target.manifest.devDependencies, ...target.manifest.dependencies };
  if (target.platform !== 'web' || !dependencies['@tanstack/react-start'])
    throw commandArgumentError(
      'ui',
      'Anhedral UI requires the Anhedral Stack web foundation. Run anhedral init <directory>.',
    );
  let root = target.root;
  for (;;) {
    const metadata = path.join(root, 'anhedral.json');
    if (existsSync(metadata)) {
      const project = JSON.parse(
        readBoundedFile(metadata, MAX_PROJECT_JSON_BYTES).toString('utf8'),
      );
      if (
        project?.schemaVersion !== 1 ||
        project.setup?.stack !== ANHEDRAL_STACK.id ||
        project.composition?.contractVersion !== 2 ||
        project.composition?.foundation !== ANHEDRAL_STACK.foundation.id ||
        path.join(root, 'apps', 'web') !== target.root
      )
        throw commandArgumentError(
          'ui',
          'Select apps/web in an Anhedral Stack project. Run anhedral ui --help.',
        );
      return;
    }
    if (existsSync(path.join(root, '.git')) || path.dirname(root) === root) break;
    root = path.dirname(root);
  }
  throw commandArgumentError(
    'ui',
    'No Anhedral Stack project found. Run anhedral init <directory>.',
  );
}
/** Public UI surface: one Anhedral Stack web target, with no native install fallback. */
export async function runAnhedralUiCommand(
  args: string[],
  output: OutputOptions,
  run: UiRunner = runUpstream,
) {
  return runUiCommand(args, output, run);
}
export async function runUiCommand(
  args: string[],
  output: OutputOptions,
  run: UiRunner = runUpstream,
) {
  if (args.some((arg) => /^--(?:native|all)(?:=|$)/.test(arg)))
    throw commandArgumentError(
      'ui',
      'Anhedral UI supports the Anhedral Stack web application only. Use --web or select apps/web with --cwd.',
    );
  const parsed = commandArguments('ui', args);
  const [action, ...names] = parsed.positional;
  if (!['init', 'add', 'list', 'diff', 'doctor'].includes(action))
    throw commandArgumentError('ui', 'Choose ui init, add, list, diff or doctor.');
  if (['add', 'diff'].includes(action) ? !names.length || names.length > 50 : names.length > 0)
    throw commandArgumentError('ui', 'Supply component names only for add/diff (at most 50).');
  const selector = 'web';
  let result: unknown;
  if (action === 'list') {
    result = {
      catalogRevision: UI_CATALOG.revision,
      ...{ platform: 'web' },
      components: UI_CATALOG.components
        .filter((item) => item[selector])
        .map((item) => ({ name: item.name, web: item.web })),
    };
  } else {
    const targets = detectUiTargets(process.cwd(), selector);
    for (const target of targets) assertAnhedralStackTarget(target);
    if (action === 'doctor') {
      const reports = targets.map(inspectUiTarget);
      result = {
        targets: reports,
        configurationReady: reports.every((report) => report.configurationReady),
      };
      if (!reports.every((report) => report.configurationReady)) process.exitCode = 1;
    } else {
      // Preflight every target before invoking any installer, before source installation.
      const plans = targets.map((target) => {
        assertUiMetadataPaths(target.root);
        const report = inspectUiTarget(target);
        const configExists = existsSync(path.join(target.root, 'components.json'));
        const issues = report.issues;
        if ((action !== 'init' || configExists) && issues.length)
          throw Error(issues.join('\n') + '\n' + report.guide);
        const items = action === 'init' ? [] : resolveUiItems(names, target.platform);
        return {
          root: target.root,
          platform: target.platform,
          items,
          command:
            action === 'init'
              ? configExists
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
          .filter((item) => item[selector])
          .map((item) => `${item.name}\tshadcn`)
          .join('\n')
      : action === 'doctor'
        ? (
            result as {
              targets: ReturnType<typeof inspectUiTarget>[];
            }
          ).targets
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
              targets: {
                root: string;
                platform: string;
                command: string[];
                output?: string;
              }[];
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
