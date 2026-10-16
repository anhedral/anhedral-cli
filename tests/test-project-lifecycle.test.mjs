import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inspectApplication } from '../dist/project-inspector.js';
import { projectLifecycle } from '../dist/project-lifecycle.js';
function fixture(run) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-lifecycle-'));
  try {
    run(inspectApplication(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
test('arbitrary directories do not become supported apps by registration or invented health', () =>
  fixture((inspection) => {
    assert.equal(inspection.lifecycle.supportedConfiguration, false);
    assert.equal(inspection.lifecycle.init.state, 'unavailable');
    assert.equal(inspection.lifecycle.auth.state, 'not-checked');
  }));
test('source readiness and recorded account selection never establish provider authentication', () =>
  fixture((inspection) => {
    inspection.selection = {
      state: 'available',
      data: { cliVersion: '0.11.1', products: ['hono'], hosting: 'cloudflare' },
    };
    inspection.readiness = { state: 'available', data: { localReady: true, checks: [] } };
    const lifecycle = projectLifecycle(inspection);
    assert.equal(lifecycle.init.state, 'configured');
    assert.equal(lifecycle.auth.state, 'not-checked');
  }));
test('partial targets, later failed attempts, deletion journals and unknown operations never imply successful shipping', () =>
  fixture((inspection) => {
    const success = {
      id: 'success',
      state: 'deployed',
      commit: '',
      recordedAt: null,
      url: null,
      kind: 'deployment',
    };
    inspection.targets = {
      state: 'available',
      data: [
        {
          id: 'api',
          provider: 'cloudflare',
          deliveryEngine: 'wrangler',
          application: 'apps/api',
          audience: 'public',
          accountReference: 'selected-account',
          latestAttempt: success,
          lastSuccessful: success,
          delivery: 'implemented',
          liveStatus: 'unknown',
        },
      ],
    };
    inspection.operation = { state: 'available', data: null };
    inspection.serviceDeletions = { state: 'available', data: [] };
    assert.equal(projectLifecycle(inspection).ship.state, 'recorded');
    assert.equal(projectLifecycle(inspection).auth.state, 'not-checked');
    inspection.targets.data.push({
      ...inspection.targets.data[0],
      id: 'web',
      latestAttempt: null,
      lastSuccessful: null,
    });
    assert.equal(projectLifecycle(inspection).ship.state, 'not-recorded');
    inspection.targets.data.pop();
    inspection.targets.data[0].latestAttempt = { ...success, id: 'failure', state: 'failed' };
    assert.equal(projectLifecycle(inspection).ship.state, 'needs-attention');
    assert.equal(projectLifecycle(inspection).ship.successfulTargets, 1);
    inspection.targets.data[0].latestAttempt = success;
    inspection.serviceDeletions.data.push({
      kind: 'd1',
      resourceId: 'db',
      name: 'data',
      state: 'uncertain',
      recordedAt: null,
    });
    assert.equal(projectLifecycle(inspection).ship.state, 'needs-attention');
    inspection.serviceDeletions = { state: 'unavailable', data: [] };
    assert.equal(projectLifecycle(inspection).ship.state, 'needs-attention');
  }));
