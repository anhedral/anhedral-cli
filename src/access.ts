import path from 'node:path';
import {
  atomicJson,
  readConfig,
  targetDirectory,
  type ApplicationProject,
} from './project-state.js';
import { listCloudflare, type CloudflareRequest } from './cloudflare.js';

export interface AccessReceipt {
  target: string;
  workerId: string;
  applicationId: string;
}
export function validatePrivateAudience(project: ApplicationProject, root: string): void {
  if (
    !project.access?.emails.length ||
    project.access.emails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  )
    throw new Error('Private delivery requires explicit allowed email addresses.');
  for (const target of project.targets) {
    const config = readConfig(targetDirectory(root, target));
    if (
      target.id === 'realtime' ||
      (
        config.durable_objects as { bindings?: { class_name?: string }[] } | undefined
      )?.bindings?.some((item) => item.class_name === 'Rooms')
    )
      throw new Error(
        'Worker-level Access does not support WebSockets. Use a reviewed hostname Access workflow or application identity for realtime products.',
      );
  }
}
function policiesMatch(policies: Record<string, unknown>[], emails: string[]): boolean {
  if (policies.length !== 1 || policies[0].decision !== 'allow') return false;
  const policy = policies[0];
  if (
    !Array.isArray(policy.include) ||
    !policy.include.length ||
    (policy.exclude as unknown[] | undefined)?.length ||
    (policy.require as unknown[] | undefined)?.length
  )
    return false;
  const actual: string[] = [];
  for (const rule of policy.include) {
    if (!rule || Object.keys(rule).length !== 1 || typeof rule.email?.email !== 'string')
      return false;
    actual.push(rule.email.email.toLowerCase());
  }
  return (
    JSON.stringify([...new Set(actual)].sort()) === JSON.stringify([...new Set(emails)].sort())
  );
}
/** Protect the entire Worker, including every route and preview, before product code is deployed. */
export async function reconcileAccess(
  root: string,
  project: ApplicationProject,
  request: CloudflareRequest,
  create: boolean,
): Promise<AccessReceipt[]> {
  validatePrivateAudience(project, root);
  const receipts: AccessReceipt[] = [];
  const workers = await listCloudflare(request, '/workers/workers');
  const apps = await listCloudflare(request, '/access/apps');
  for (const target of project.targets) {
    const matches = workers.filter((item) => item.name === target.workerName);
    if (matches.length > 1) throw new Error('Ambiguous Worker identity.');
    let worker = matches[0];
    if (!worker && create)
      worker = (await request('POST', '/workers/workers', { name: target.workerName }))
        .result as Record<string, unknown>;
    if (!worker || typeof worker.id !== 'string' || !/^[a-f0-9]{32}$/i.test(worker.id))
      throw new Error('Provider did not return an immutable Worker ID.');
    const destinations = [{ type: 'worker', worker_id: worker.id }];
    const candidates = apps.filter(
      (app) =>
        Array.isArray(app.destinations) &&
        app.destinations.some((destination) => destination.worker_id === worker.id),
    );
    if (candidates.length > 1)
      throw new Error(
        'Multiple Access applications target this Worker; reconcile policies explicitly.',
      );
    let app = candidates[0];
    if (!app && create) {
      app = (
        await request('POST', '/access/apps', {
          name: `Anhedral ${project.id} ${target.id}`,
          type: 'self_hosted',
          session_duration: '24h',
          destinations,
          policies: [
            {
              name: 'Application members',
              decision: 'allow',
              include: project.access!.emails.map((email) => ({ email: { email } })),
            },
          ],
        })
      ).result as Record<string, unknown>;
      apps.push(app);
    }
    if (
      !app ||
      typeof app.id !== 'string' ||
      !/^[a-f0-9-]{36}$/i.test(app.id) ||
      app.type !== 'self_hosted' ||
      !Array.isArray(app.destinations) ||
      app.destinations.length !== 1 ||
      app.destinations[0].type !== 'worker' ||
      app.destinations[0].worker_id !== worker.id
    )
      throw new Error(
        'Whole-Worker private Access protection is missing or differs from the requested policy.',
      );
    const policies = await listCloudflare(request, `/access/apps/${app.id}/policies`);
    if (!policiesMatch(policies, project.access!.emails))
      throw new Error(
        'Access policies differ from the explicit application members; no unrelated policy was overwritten.',
      );
    receipts.push({ target: target.id, workerId: worker.id, applicationId: app.id });
    if (create)
      atomicJson(path.join(root, '.anhedral/access.json'), {
        schemaVersion: 1,
        projectId: project.id,
        accountId: project.accountId,
        checkedAt: new Date().toISOString(),
        receipts,
      });
  }
  return receipts;
}
