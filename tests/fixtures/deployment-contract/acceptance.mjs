import assert from 'node:assert/strict';
import test from 'node:test';

export function deploymentAcceptance(contract, fixture) {
  const copy = (value) => structuredClone(value);
  test('deployment wire fixtures are strict, versioned and separate pending from readiness', () => {
    for (const [schema, value] of [
      [contract.deploymentManifestSchema, fixture.manifest],
      [contract.deploymentPlanSchema, fixture.plan],
      [contract.deploymentEventSchema, fixture.event],
      [contract.deploymentResultSchema, fixture.pending],
      [contract.deploymentResultSchema, fixture.ready],
      [contract.deploymentErrorSchema, fixture.error],
    ]) {
      assert.deepEqual(schema.parse(value), value);
      assert.equal(schema.safeParse({ ...value, contractVersion: 99 }).success, false);
      assert.equal(schema.safeParse({ ...value, secret: 'must-not-travel' }).success, false);
    }
    assert.equal(
      contract.deploymentResultSchema.safeParse({ ...fixture.pending, state: 'ready' }).success,
      false,
    );
    assert.equal(
      contract.deploymentResultSchema.safeParse({
        ...fixture.ready,
        url: 'http://fixture.anhedral.app',
      }).success,
      false,
    );
    assert.equal(
      contract.deploymentResultSchema.safeParse({
        ...fixture.ready,
        url: Object.assign(new URL(fixture.ready.url), { username: 'fixture', password: 'fixture' })
          .href,
      }).success,
      false,
    );
    const production = copy(fixture.plan);
    production.manifest.intent.environment = 'production';
    assert.equal(contract.deploymentPlanSchema.safeParse(production).success, false);
    production.requiredAuthority = 'production-approval';
    assert.equal(contract.deploymentPlanSchema.safeParse(production).success, true);
    assert.equal(
      contract.deploymentErrorSchema.parse({ ...fixture.error, stateChanged: 'unknown' })
        .stateChanged,
      'unknown',
    );
  });
  test('invalid prerequisites, identities, digests and mutable images fail before deployment', () => {
    for (const change of [
      (m) => {
        m.capabilities = ['database-auth'];
      },
      (m) => {
        m.capabilities.push('hono');
      },
      (m) => {
        m.capabilities.push('unknown');
      },
      (m) => {
        m.identity = 'none';
      },
      (m) => {
        m.capabilities = [];
      },
      (m) => {
        m.intent.environment = 'local';
      },
    ]) {
      const manifest = copy(fixture.manifest);
      change(manifest);
      assert.equal(contract.deploymentManifestSchema.safeParse(manifest).success, false);
    }
    for (const change of [
      (p) => {
        p.source.sourceDigest = 'git-branch';
      },
      (p) => {
        p.runtimeImage = 'registry.example.com/candidate:latest';
      },
      (p) => {
        p.expectedGeneration = -1;
      },
    ]) {
      const plan = copy(fixture.plan);
      change(plan);
      assert.equal(contract.deploymentPlanSchema.safeParse(plan).success, false);
    }
  });
}
