import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const files = execFileSync('git', ['ls-files', '--cached', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter((name) => /\.(?:md|markdown)$/i.test(name));
if (files.length > 20) {
  console.error(
    `Markdown budget exceeded: ${files.length}/20. Consolidate existing guides.\n${files.join('\n')}`,
  );
  process.exitCode = 1;
} else {
  console.log(`Markdown budget: ${files.length}/20`);
}

const notes = 'docs/agent-notes/README.md';
if (existsSync(notes) && readFileSync(notes, 'utf8').trimEnd().split('\n').length > 100) {
  console.error(
    'Development notes exceed 100 lines. Retire completed entries; Git preserves their history.',
  );
  process.exitCode = 1;
}
