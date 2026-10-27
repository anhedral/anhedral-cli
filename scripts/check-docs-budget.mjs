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
