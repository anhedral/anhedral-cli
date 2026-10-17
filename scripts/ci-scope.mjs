import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Keep the exception narrow: plugin instructions, examples and registry data
// can change shipped behavior even when their filenames look like documentation.
export function needsFullCI(files) {
  return (
    files.length === 0 ||
    files.some(
      (file) =>
        file !== 'README.md' && file !== 'CONTRIBUTING.md' && !/^docs\/[^\r\n]+\.md$/.test(file),
    )
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base = process.env.CI_BASE_SHA;
  const comparable = /^[a-f0-9]{40}$/.test(base ?? '') && !/^0+$/.test(base);
  let full = true;
  if (['push', 'pull_request'].includes(process.env.GITHUB_EVENT_NAME) && comparable) {
    // Disable rename detection so moving executable source into docs cannot
    // hide the deleted source path. NUL delimiters preserve unusual filenames.
    const files = execFileSync('git', ['diff', '--no-renames', '--name-only', '-z', base, 'HEAD'], {
      encoding: 'utf8',
    })
      .split('\0')
      .filter(Boolean);
    full = needsFullCI(files);
    if (!full) execFileSync('git', ['diff', '--check', base, 'HEAD'], { stdio: 'inherit' });
  }
  appendFileSync(process.env.GITHUB_OUTPUT, `full=${full}\n`);
  console.log(full ? 'Full CI required.' : 'Documentation-only change: whitespace check passed.');
}
