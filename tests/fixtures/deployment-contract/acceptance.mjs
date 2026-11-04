import assert from "node:assert/strict";
import test from "node:test";

export function deploymentAcceptance(contract, fixture) {
  const copy = (value) => structuredClone(value);
  test("deployment wire fixtures are strict, versioned and separate pending from readiness", () => {
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
      assert.equal(schema.safeParse({ ...value, secret: "must-not-travel" }).success, false);
    }
    assert.equal(
      contract.deploymentResultSchema.safeParse({ ...fixture.pending, state: "ready" }).success,
      false,
    );
    assert.equal(
      contract.deploymentResultSchema.safeParse({
        ...fixture.ready,
        url: "http://fixture.anhedral.app",
      }).success,
      false,
    );
    assert.equal(
      contract.deploymentResultSchema.safeParse({
        ...fixture.ready,
        url: Object.assign(new URL(fixture.ready.url), { username: "fixture", password: "fixture" })
          .href,
      }).success,
      false,
    );
    const production = copy(fixture.plan);
    production.manifest.intent.environment = "production";
    assert.equal(contract.deploymentPlanSchema.safeParse(production).success, false);
    production.requiredAuthority = "production-approval";
    assert.equal(contract.deploymentPlanSchema.safeParse(production).success, true);
    assert.equal(
      contract.deploymentErrorSchema.parse({ ...fixture.error, stateChanged: "unknown" })
        .stateChanged,
      "unknown",
    );
  });
  test("invalid prerequisites, identities, digests and mutable images fail before deployment", () => {
    for (const change of [
      (m) => {
        m.capabilities = ["database-auth"];
      },
      (m) => {
        m.capabilities.push("hono");
      },
      (m) => {
        m.capabilities.push("unknown");
      },
      (m) => {
        m.identity = "none";
      },
      (m) => {
        m.capabilities = [];
      },
      (m) => {
        m.intent.environment = "local";
      },
    ]) {
      const manifest = copy(fixture.manifest);
      change(manifest);
      assert.equal(contract.deploymentManifestSchema.safeParse(manifest).success, false);
    }
    for (const change of [
      (p) => {
        p.source.sourceDigest = "git-branch";
      },
      (p) => {
        p.runtimeImage = "registry.example.com/candidate:latest";
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
  test("TanStack source versions and the five launch manifests preserve the hosting boundary", () => {
    assert.equal(fixture.tanstackCompositions.length, 5);
    for (const { composition, manifest } of fixture.tanstackCompositions) {
      assert.deepEqual(contract.sourceCompositionSchema.parse(composition), composition);
      assert.deepEqual(contract.deploymentManifestSchema.parse(manifest), manifest);
      assert.equal(
        contract.sourceCompositionSchema.safeParse({ ...composition, contractVersion: 1 }).success,
        false,
      );
      assert.equal(
        contract.sourceCompositionSchema.safeParse({ ...composition, foundation: "next-opennext" })
          .success,
        false,
      );
      assert.equal(
        contract.deploymentManifestSchema.safeParse({ ...manifest, foundation: "next-opennext" })
          .success,
        false,
      );
      assert.equal(
        contract.deploymentManifestSchema.safeParse({
          ...manifest,
          intent: { ...manifest.intent, runtimeProfile: "progressive-next-hono-d1-v1" },
        }).success,
        false,
      );
      assert.equal(
        contract.deploymentManifestSchema.safeParse({ ...manifest, hostedAdmission: true }).success,
        false,
      );
    }
    const backend = fixture.tanstackCompositions[1].manifest;
    for (const capabilities of [
      ["hono"],
      ["database-auth"],
      ["r2"],
      ["stripe"],
      ["hono", "database-auth", "expo"],
      ["hono", "database-auth", "realtime"],
    ])
      assert.equal(
        contract.deploymentManifestSchema.safeParse({ ...backend, capabilities }).success,
        false,
      );
    assert.equal(
      contract.deploymentManifestSchema.safeParse({
        ...backend,
        identity: "platform-application-services-v1",
      }).success,
      false,
    );
    const legacy = {
      contractVersion: 1,
      foundation: "next-opennext",
      generatorVersion: null,
      identity: "none",
      capabilities: {},
    };
    assert.equal(contract.sourceCompositionSchema.safeParse(legacy).success, false);
    // Retired capabilities cannot be reintroduced through source provenance.
    const openSource = {
      ...fixture.tanstackCompositions[1].composition,
      capabilities: { hono: "0.18.0", "database-auth": "0.18.0", expo: "0.18.0" },
    };
    assert.equal(contract.sourceCompositionSchema.safeParse(openSource).success, false);
  });
}

/** Shared project wire acceptance for source-owned Platform and CLI projections. */
export function cliProjectsAcceptance(contract, fixture) {
  test("CLI project transport is bounded, strict and preserves source-upload identity", () => {
    for (const [schema, value] of [
      [contract.cliProjectCreateInputSchema, fixture.cliProjects.input],
      [contract.cliProjectListSchema, fixture.cliProjects.list],
      [contract.cliProjectCreateReceiptSchema, fixture.cliProjects.receipt],
    ]) {
      assert.deepEqual(schema.parse(value), value);
      assert.equal(schema.safeParse({ ...value, protocol: 2 }).success, false);
      assert.equal(schema.safeParse({ ...value, secret: "must-not-travel" }).success, false);
    }
    assert.deepEqual(contract.cliProjectListQuerySchema.parse({}), { limit: 50 });
    for (const limit of [0, 101, 1.5, "nope"])
      assert.equal(contract.cliProjectListQuerySchema.safeParse({ limit }).success, false);
    for (const cursor of ["", "mutable-name", "../../../other"])
      assert.equal(contract.cliProjectListQuerySchema.safeParse({ cursor }).success, false);
    for (const name of ["", " ", "x".repeat(161)])
      assert.equal(
        contract.cliProjectCreateInputSchema.safeParse({ ...fixture.cliProjects.input, name })
          .success,
        false,
      );
    for (const change of [
      { summary: "x".repeat(2001) },
      { teamId: fixture.cliProjects.list.team.id },
      { starter: "anhedral-stack" },
    ])
      assert.equal(
        contract.cliProjectCreateInputSchema.safeParse({ ...fixture.cliProjects.input, ...change })
          .success,
        false,
      );
    assert.equal(
      contract.cliProjectCreateReceiptSchema.safeParse({
        ...fixture.cliProjects.receipt,
        projectId: fixture.cliProjects.list.team.id,
      }).success,
      false,
    );
    assert.equal(
      contract.cliProjectCreateReceiptSchema.safeParse({
        ...fixture.cliProjects.receipt,
        initialization: "cloud-scaffold",
      }).success,
      false,
    );
    assert.equal(
      contract.cliProjectListSchema.safeParse({
        ...fixture.cliProjects.list,
        team: null,
        projects: [],
      }).success,
      true,
    );
    assert.equal(
      contract.cliProjectListSchema.safeParse({
        ...fixture.cliProjects.list,
        projects: Array(101).fill(fixture.cliProjects.list.projects[0]),
      }).success,
      false,
    );
  });
}
