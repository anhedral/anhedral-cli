import fs from 'node:fs';
import path from 'node:path';
import { runStagedTransaction, recoverInterruptedTransaction } from '../../dist/transaction.js';

const [mode, root] = process.argv.slice(2);
if (!['rollback', 'recover', 'legacy'].includes(mode) || !root || !path.isAbsolute(root))
  throw new Error('Invalid recovery subprocess configuration');
if (mode === 'rollback') {
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, 'value'), 'original');
  await runStagedTransaction(root, {
    commitPaths: ['value', 'z-missing'],
    build: async (stage) => fs.writeFileSync(path.join(stage, 'value'), 'replacement'),
  });
} else {
  if (mode === 'legacy') {
    fs.mkdirSync(root);
    const transactionId = '2147483647-22222222-2222-4222-8222-222222222222';
    const backupRoot = path.join(root, '.anhedral-txn', `backup-${transactionId}`);
    const stageRoot = path.join(root, '.anhedral-txn', `stage-${transactionId}`);
    fs.mkdirSync(backupRoot, { recursive: true });
    fs.mkdirSync(stageRoot, { recursive: true });
    fs.writeFileSync(path.join(root, 'value'), 'consumer-recreated');
    fs.writeFileSync(
      path.join(root, '.anhedral-journal.json'),
      JSON.stringify({
        version: 2,
        backupRoot,
        stageRoot,
        entries: [
          {
            relativePath: 'value',
            backupPath: path.join(backupRoot, 'value'),
            installed: false,
            installedFingerprint: null,
          },
        ],
        createdDirectories: [],
      }),
    );
  }
  try {
    recoverInterruptedTransaction(root);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
