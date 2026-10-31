import assert from "node:assert/strict";
import test from "node:test";

export function deploymentAcceptance(contract, fixture) {
  const copy = (value) => structuredClone(value);
  test("deployment wire fixtures are strict, versioned and separate pending from readiness", () => {
    for (const [schema, value] of [
      [contract.deploymentManifestSchema, fixture.manifest],
      [contract.deploymentPlanSchema, fixture.plan],
      [contract.hostingPolicySchema, fixture.policy],
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
  test("hosting acceptance requires trusted policy and exact artifact provenance", () => {
    const { manifest, policy } = fixture;
    assert.deepEqual(contract.hostingCompatibility(manifest, policy), {
      compatible: true,
      runtimeImage: policy.profiles[0].runtimeImage,
    });
    assert.deepEqual(
      contract.hostingCompatibility(manifest, { contractVersion: 1, profiles: [] }),
      {
        compatible: false,
        code: "UNSUPPORTED_PROFILE",
      },
    );
    for (const key of ["version", "sourceRevision", "packageIntegrity"]) {
      const changed = copy(manifest);
      changed.cliArtifact[key] =
        key === "version"
          ? "0.17.1"
          : key === "sourceRevision"
            ? "b".repeat(40)
            : "sha512-" + "B".repeat(86) + "==";
      assert.equal(contract.hostingCompatibility(changed, policy).code, "UNREVIEWED_ARTIFACT");
    }
    const identity = copy(manifest);
    identity.identity = "platform-application-services-v1";
    assert.equal(contract.hostingCompatibility(identity, policy).code, "IDENTITY_ADAPTER_REQUIRED");
    const extra = copy(manifest);
    extra.capabilities.push("stripe");
    assert.equal(contract.hostingCompatibility(extra, policy).code, "UNSUPPORTED_CAPABILITY");
    extra.hostingApproved = true;
    assert.equal(contract.hostingCompatibility(extra, policy).code, "INVALID_MANIFEST");
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
      assert.equal(
        contract.hostingCompatibility(manifest, fixture.policy).code,
        "INVALID_MANIFEST",
      );
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
    const duplicate = copy(fixture.policy);
    duplicate.profiles.push(duplicate.profiles[0]);
    assert.equal(contract.hostingPolicySchema.safeParse(duplicate).success, false);
  });
}
