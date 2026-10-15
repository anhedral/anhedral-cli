import { existsSync, readdirSync, readFileSync, lstatSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import type { DeploymentTarget } from './project-state.js';

const logsDirectory = () => path.join(homedir(), '.void', 'logs');
export function voidLogSnapshot(directory = logsDirectory()): Set<string> {
  return new Set(
    existsSync(directory)
      ? readdirSync(directory).filter((name) => /^deploy-.+\.jsonl$/.test(name))
      : [],
  );
}
/** Pinned void@0.27.0 JSONL contract, inspected from its published distribution.
 * Log prose never establishes success; exact terminal records and provider state do. */
export function readVoidDeploymentReceipt(
  before: Set<string>,
  directory: string,
  target: DeploymentTarget,
  startedAt: number,
  logs = logsDirectory(),
) {
  const receipts: {
    target: string;
    versionId: string;
    urls: string[];
    providerConfirmed: boolean;
  }[] = [];
  for (const name of voidLogSnapshot(logs)) {
    if (before.has(name)) continue;
    const file = path.join(logs, name);
    const stat = lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 8 * 1024 * 1024) continue;
    const receipt = parseVoidDeploymentLog(
      readFileSync(file, 'utf8'),
      realpathSync(directory),
      target,
      startedAt,
    );
    if (!receipt) continue;
    receipts.push(receipt);
  }
  if (receipts.length !== 1)
    throw new Error(
      'No unique successful pinned Void deployment receipt. Deployment may have occurred; inspect provider status before retrying.',
    );
  return receipts[0];
}

export function parseVoidDeploymentLog(
  source: string,
  directory: string,
  target: DeploymentTarget,
  startedAt: number,
) {
  let records: Record<string, unknown>[];
  try {
    records = source
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
  } catch {
    return undefined;
  }
  if (records.some((record) => !record || typeof record !== 'object' || Array.isArray(record)))
    return undefined;
  const start = records[0];
  const end = records.at(-1);
  if (
    start?.msg !== 'deploy_start' ||
    start.cwd !== directory ||
    typeof start.ts !== 'number' ||
    start.ts < startedAt ||
    end?.msg !== 'deploy_end' ||
    end.ok !== true
  )
    return undefined;
  const matches = records.filter(
    (record) =>
      record.msg === 'cloudflare_deploy_end' &&
      record.ok === true &&
      record.worker === target.workerName,
  );
  if (
    matches.length !== 1 ||
    typeof matches[0].versionId !== 'string' ||
    !/^[a-f0-9-]{36}$/i.test(matches[0].versionId)
  )
    return undefined;
  return {
    target: target.id,
    versionId: matches[0].versionId,
    urls: [] as string[],
    providerConfirmed: false,
  };
}
