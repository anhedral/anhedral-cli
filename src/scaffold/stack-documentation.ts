import { WORKER_DEV_PORTS } from '../dependencies.js';
import type { ResolvedStackRegistry } from '../registry/resolve.js';
import { put } from './files.js';

/** Human-readable companion to the current resolved registry, refreshed by add. */
export function writeStackDocumentation(root: string, registry: ResolvedStackRegistry): void {
  const sections = registry.items.map((item) => {
    const lines = [
      `## ${item.name}`,
      '',
      item.description + '.',
      '',
      `Targets: ${item.targets.map((target) => `\`${target}\``).join(', ')}.`,
    ];
    if (item.environment.length)
      lines.push(`Environment: ${item.environment.map((key) => `\`${key}\``).join(', ')}.`);
    if (item.bindings)
      lines.push(
        '',
        'Worker configuration:',
        '',
        '```json',
        JSON.stringify(item.bindings, null, 2),
        '```',
      );
    if (item.setup) {
      for (const [label, entries] of [
        ['Required setup', item.setup.resources],
        ['Credentials', item.setup.credentials],
        ['Verify before delivery', item.setup.verify],
      ] as const) {
        if (!entries.length) continue;
        lines.push('', `${label}:`, '', ...entries.map((entry) => `- ${entry}`));
      }
    }
    return lines.join('\n');
  });
  const ports = Object.entries(WORKER_DEV_PORTS)
    .filter(([app]) => registry.items.some((item) => item.targets.includes(`apps/${app}`)))
    .map(([app, port]) => `| ${app} | ${port.http} | ${port.inspector} |`);
  put(
    root,
    'docs/stack.md',
    [
      '# Selected stack',
      '',
      `Generated from the bundled Anhedral ${registry.cliVersion} registry. Project configuration lives in anhedral.json; setup and registry record the current selection and generated source, providers holds integration settings, and cloudflare/vercel hold selected hosting configuration. This document is refreshed by add. Keep product decisions in docs/architecture.md and acceptance evidence in docs/verification.md.`,
      '',
      'These are scaffolds and integration boundaries. Provider access, migrations, authorization and live behavior require the setup and checks listed below.',
      ...(ports.length
        ? [
            '',
            '## Local Worker ports',
            '',
            '| Application | HTTP | Inspector |',
            '| --- | --- | --- |',
            ...ports,
          ]
        : []),
      '',
      ...sections.flatMap((section) => [section, '']),
    ].join('\n'),
  );
}
