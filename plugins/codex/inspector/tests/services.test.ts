import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inspectApplication } from '../../../../src/project-inspector.ts';
import { serviceInventory } from '../shared/services.ts';
import { serviceInventorySchema } from '../shared/service-schema.ts';
import type { ProjectInspection } from '../../../../src/inspector-model.ts';
const recordedAt = '2026-10-14T00:00:00.000Z';
function fixture(run: (inspection: ProjectInspection) => void) {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-service-inventory-'));
  try {
    writeFileSync(path.join(directory, 'package.json'), '{"name":"service-test"}');
    run(inspectApplication(directory));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
function binding(
  inspection: ProjectInspection,
  kind = 'D1',
  resourceId: string | null = 'database-id',
) {
  inspection.configuration = {
    state: 'available',
    data: {
      bindings: [
        {
          application: 'apps/api',
          name: 'DB',
          kind,
          resourceId,
          identifierRequired: true,
          configured: resourceId !== null,
        },
      ],
      schedules: [],
      environment: [],
    },
  };
}

test('resource receipts join only the correct kind and exact identifier', () =>
  fixture((inspection) => {
    binding(inspection);
    inspection.cloudflareResources.data = [
      { kind: 'kv', name: 'database-id', id: 'other-id', reused: true, recordedAt },
      { kind: 'd1', name: 'database-id', id: 'unrelated-id', reused: true, recordedAt },
      { kind: 'd1', name: 'app-data', id: 'database-id', reused: false, recordedAt },
    ];
    const inventory = serviceInventory(inspection);
    const db = inventory.entries.find((entry) => entry.name === 'DB')!;
    assert.equal(db.status, 'Recorded');
    assert.equal(db.ownership, 'created');
    assert.equal(db.recordedAt, recordedAt);
    assert.equal(inventory.entries.filter((entry) => entry.id.startsWith('receipt:')).length, 2);
    assert.deepEqual(serviceInventorySchema.parse(inventory), inventory);
  }));

test('name-only D1 matches never establish receipt ownership', () =>
  fixture((inspection) => {
    binding(inspection);
    inspection.cloudflareResources.data = [
      { kind: 'd1', name: 'database-id', id: 'different-id', reused: true, recordedAt },
    ];
    const db = serviceInventory(inspection).entries.find((entry) => entry.name === 'DB')!;
    assert.equal(db.status, 'Configured');
    assert.equal(db.ownership, 'unknown');
    assert.equal(db.recordedAt, null);
  }));

test('bucket source name references match provider receipts', () =>
  fixture((inspection) => {
    for (const [kind, receiptKind] of [['R2', 'r2']] as const) {
      binding(inspection, kind, 'service-name');
      inspection.cloudflareResources.data = [
        { kind: receiptKind, name: 'service-name', id: 'provider-id', reused: true, recordedAt },
      ];
      assert.equal(serviceInventory(inspection).entries[0].ownership, 'reused');
    }
  }));

test('missing identifiers and corrupt resource evidence never look provisioned', () =>
  fixture((inspection) => {
    binding(inspection, 'D1', null);
    inspection.cloudflareResources = {
      state: 'unavailable',
      data: [],
      error: 'Foreign resource receipt.',
    };
    const inventory = serviceInventory(inspection);
    assert.equal(inventory.entries[0].status, 'Declared');
    assert.deepEqual(
      inventory.errors.filter((error) => error === 'Foreign resource receipt.'),
      ['Foreign resource receipt.'],
    );
  }));

test('provider operations stay pending and selected providers remain visible without operations', () =>
  fixture((inspection) => {
    inspection.setupProviders.data = [
      {
        id: 'revenuecat',
        managementCredential: 'NEON_API_KEY',
        ownerSteps: ['Choose a region.'],
        authentication: 'not-checked',
        permissions: 'unknown',
        billing: 'unknown',
      },
    ];
    inspection.integrations.data = [{ provider: 'revenuecat', operations: [] }];
    assert.equal(serviceInventory(inspection).entries[0].status, 'Declared');
    inspection.integrations.data[0].operations = [
      {
        operation: 'create-project',
        status: 'pending',
        resources: { project: 'neon-id' },
        recovery: 'Inspect pending resource.',
        kind: 'project',
      },
    ];
    const inventory = serviceInventory(inspection);
    assert.equal(inventory.entries.length, 1);
    assert.equal(inventory.entries[0].status, 'Pending');
    assert.equal(inventory.entries[0].recordedAt, null);
    assert.equal(inventory.entries[0].ownership, 'unknown');
  }));

test('application receipt is recorded while latest failed attempt remains visible', () =>
  fixture((inspection) => {
    const success = {
      id: 'release',
      state: 'deployed',
      commit: 'a'.repeat(40),
      recordedAt,
      url: 'https://example.com/',
      kind: 'deployment' as const,
    };
    inspection.targets.data = [
      {
        id: 'web',
        provider: 'cloudflare',
        application: 'apps/web',
        audience: 'private',
        accountReference: null,
        lastSuccessful: success,
        latestAttempt: { ...success, id: 'new-attempt', state: 'failed' },
        delivery: 'implemented',
        liveStatus: 'unknown',
      },
    ];
    const entry = serviceInventory(inspection).entries[0];
    assert.equal(entry.status, 'Recorded');
    assert.ok(entry.notes.includes('Latest attempt: failed'));
    assert.ok(entry.notes.includes('Current provider health is not checked.'));
    assert.equal(entry.url, 'https://example.com/');
  }));

test('selected stack retains local tooling separately from hosted resources', () =>
  fixture((inspection) => {
    inspection.selection.data.products = ['expo', 'styling', 'd1', 'd1'];
    const inventory = serviceInventory(inspection);
    assert.equal(inventory.entries.length, 0);
    assert.equal(inventory.capabilities.length, 3);
    assert.match(inventory.capabilities.find((item) => item.name === 'expo')!.description, /Expo/);
  }));

test('large inventories report truncation and keep their output within the schema budget', () =>
  fixture((inspection) => {
    inspection.integrations.data = ['revenuecat', 'stripe'].map((provider) => ({
      provider,
      operations: Array.from({ length: 1200 }, (_, index) => ({
        operation: `operation-${index}`,
        status: 'complete' as const,
        resources: {},
        recovery: 'Recorded.',
        kind: 'project',
      })),
    }));
    const inventory = serviceInventory(inspection);
    assert.equal(inventory.entries.length, 2000);
    assert.ok(
      inventory.errors.includes(
        'Service inventory exceeds its display limit. Some entries are not shown.',
      ),
    );
    assert.deepEqual(serviceInventorySchema.parse(inventory), inventory);
  }));
