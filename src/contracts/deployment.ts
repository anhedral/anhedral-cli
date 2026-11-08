import { z } from "zod";

/** Portable transport contract. No database, framework or provider imports. */
export const deploymentContractVersion = 1;
export const deploymentDigestSchema = z.string().regex(/^[a-f0-9]{64}$/);
const revisionSchema = z.string().regex(/^[a-f0-9]{40}$/);
const versionSchema = z.string().regex(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/);
export const applicationIdentitySchema = z.enum(["none", "better-auth-d1-v1"]);
export const deploymentCapabilitySchema = z.enum(["hono", "database-auth", "r2", "stripe"]);
const capabilitiesSchema = z
  .array(deploymentCapabilitySchema)
  .max(4)
  .refine((items) => new Set(items).size === items.length, "Duplicate capabilities.");
export const cliArtifactSchema = z
  .object({
    version: versionSchema,
    sourceRevision: revisionSchema,
    packageIntegrity: z.string().regex(/^sha512-[A-Za-z0-9+/]{86}==$/),
  })
  .strict();
export const deploymentIntentSchema = z
  .object({
    contractVersion: z.literal(1),
    runtimeProfile: z.literal("anhedral-stack"),
    environment: z.enum(["preview", "production"]),
    visibility: z.enum(["protected", "public"]),
  })
  .strict();
/** Source provenance only. Null versions preserve unknown legacy origins honestly. */
export const sourceCompositionSchema = z
  .object({
    contractVersion: z.literal(2),
    foundation: z.literal("tanstack-start"),
    generatorVersion: versionSchema.nullable(),
    identity: applicationIdentitySchema,
    capabilities: z.partialRecord(deploymentCapabilitySchema, versionSchema.nullable()),
  })
  .strict();
export const deploymentManifestSchema = z
  .object({
    contractVersion: z.literal(1),
    foundation: z.literal("tanstack-start"),
    capabilities: capabilitiesSchema,
    identity: applicationIdentitySchema,
    cliArtifact: cliArtifactSchema,
    intent: deploymentIntentSchema,
  })
  .strict()
  .superRefine((value, ctx) => {
    const selected = new Set(value.capabilities);
    if (selected.has("hono") !== selected.has("database-auth"))
      ctx.addIssue({
        code: "custom",
        path: ["capabilities"],
        message: "Anhedral Stack hosting requires Hono and database-auth together.",
      });
    if (value.identity !== (selected.has("database-auth") ? "better-auth-d1-v1" : "none"))
      ctx.addIssue({
        code: "custom",
        path: ["identity"],
        message: "Anhedral Stack hosting preserves standalone Better Auth/D1 identity.",
      });
    const prerequisites: Record<string, string[]> = {
      "database-auth": ["hono"],
      r2: ["database-auth"],
      stripe: ["database-auth"],
    };
    for (const id of value.capabilities)
      for (const parent of prerequisites[id] ?? [])
        if (!selected.has(parent as z.infer<typeof deploymentCapabilitySchema>))
          ctx.addIssue({
            code: "custom",
            path: ["capabilities"],
            message: `${id} requires ${parent}.`,
          });
  });
export const deploymentErrorSchema = z
  .object({
    code: z.enum([
      "INVALID_MANIFEST",
      "UNSUPPORTED_PROFILE",
      "UNREVIEWED_ARTIFACT",
      "IDENTITY_ADAPTER_REQUIRED",
      "UNSUPPORTED_CAPABILITY",
      "STALE_PLAN",
      "AUTHORITY_REQUIRED",
      "OPERATION_PENDING",
      "DEPLOYMENT_FAILED",
    ]),
    message: z.string().min(1).max(2000),
    recovery: z.string().min(1).max(2000),
    stateChanged: z.union([z.boolean(), z.literal("unknown")]),
    operationId: z.uuid().nullable(),
  })
  .strict();
const operationStateSchema = z.enum([
  "queued",
  "uploading",
  "building",
  "preparing",
  "verifying",
  "awaiting-approval",
  "ready",
  "failed",
  "cancelled",
]);
const operationFields = {
  contractVersion: z.literal(1),
  operationId: z.uuid(),
  requestId: z.uuid(),
};
export const deploymentEventSchema = z
  .object({
    ...operationFields,
    sequence: z.number().int().nonnegative(),
    state: operationStateSchema,
    occurredAt: z.iso.datetime(),
  })
  .strict();
export const deploymentResultSchema = z.discriminatedUnion("status", [
  z
    .object({
      ...operationFields,
      status: z.literal("pending"),
      state: operationStateSchema.exclude(["ready", "failed", "cancelled"]),
    })
    .strict(),
  z
    .object({
      ...operationFields,
      status: z.literal("ready"),
      candidateId: z.uuid(),
      sourceDigest: deploymentDigestSchema,
      artifactDigest: deploymentDigestSchema,
      configurationRevision: deploymentDigestSchema,
      url: z.url().refine((value) => {
        const url = new URL(value);
        return url.protocol === "https:" && url.origin === value && !url.username && !url.password;
      }),
    })
    .strict(),
  z
    .object({ ...operationFields, status: z.literal("failed"), error: deploymentErrorSchema })
    .strict(),
  z
    .object({ ...operationFields, status: z.literal("cancelled"), resourcesRetained: z.boolean() })
    .strict(),
]);
export type DeploymentManifest = z.infer<typeof deploymentManifestSchema>;
export type DeploymentIntent = z.infer<typeof deploymentIntentSchema>;
export type DeploymentEvent = z.infer<typeof deploymentEventSchema>;
export type DeploymentResult = z.infer<typeof deploymentResultSchema>;
export type DeploymentError = z.infer<typeof deploymentErrorSchema>;
export type SourceComposition = z.infer<typeof sourceCompositionSchema>;
export type CliArtifact = z.infer<typeof cliArtifactSchema>;
