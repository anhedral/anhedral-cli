import fs from 'node:fs';
import path from 'node:path';
import { syncBuiltinESMExports } from 'node:module';

// Static subprocess fault injection. Configuration is data, never executable code.
const { root, point } = JSON.parse(process.env.ANHEDRAL_TEST_FAULT_CONFIG);
const allowed = [
  'staging',
  'journal',
  'installed',
  'after-backup',
  'before-backup',
  'after-restore',
];
if (typeof root !== 'string' || !path.isAbsolute(root) || !allowed.includes(point))
  throw new Error('Invalid recovery fixture fault configuration');
const isPart = (file, prefix) =>
  typeof file === 'string' && file.split(path.sep).some((part) => part.startsWith(prefix));
const matchesRename = (from, to) => {
  switch (point) {
    case 'journal':
      return to === path.join(root, '.anhedral-journal.json');
    case 'installed':
      return isPart(from, 'stage-') && to === path.join(root, 'anhedral.json');
    case 'after-backup':
      return from === path.join(root, 'anhedral.json') && isPart(to, 'backup-');
    case 'before-backup':
      return from === path.join(root, 'value') && isPart(to, 'backup-');
    case 'after-restore':
      return isPart(from, 'backup-') && to === path.join(root, 'value');
    default:
      return false;
  }
};
const rename = fs.renameSync;
fs.renameSync = (from, to) => {
  if (point === 'before-backup' && matchesRename(from, to)) process.exit(79);
  const result = rename(from, to);
  if (point !== 'before-backup' && matchesRename(from, to)) process.exit(79);
  return result;
};
const mkdir = fs.mkdirSync;
fs.mkdirSync = (...args) => {
  const result = mkdir(...args);
  if (point === 'staging' && isPart(args[0], 'stage-')) process.exit(79);
  return result;
};
syncBuiltinESMExports();
