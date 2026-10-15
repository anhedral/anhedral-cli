import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

export function dependencyNotices(moduleFiles) {
  const packages = new Map();
  for (const file of moduleFiles) {
    if (!file.replaceAll('\\', '/').includes('node_modules/')) continue;
    let directory = path.dirname(path.resolve(file.split('?')[0]));
    while (directory.includes(`${path.sep}node_modules${path.sep}`)) {
      const manifest = path.join(directory, 'package.json');
      if (existsSync(manifest)) {
        const metadata = JSON.parse(readFileSync(manifest, 'utf8'));
        if (metadata.name && metadata.version) {
          packages.set(`${metadata.name}@${metadata.version}`, directory);
          break;
        }
      }
      directory = path.dirname(directory);
    }
  }
  return [...packages.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, directory]) => {
      const licenses = readdirSync(directory).filter((file) =>
        /^(?:licen[cs]e|copying|notice|copyright)(?:[.-]|$)/i.test(file),
      );
      if (!licenses.length) throw new Error(`Bundled dependency needs a license notice: ${name}`);
      return `${name}\n${licenses
        .sort()
        .map((file) => readFileSync(path.join(directory, file), 'utf8'))
        .join('\n')}\n`;
    })
    .join('\n----------------------------------------\n\n');
}
