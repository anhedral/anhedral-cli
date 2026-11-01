import { z } from 'zod';
import { deploymentManifestSchema } from './deployment.ts';
export const CLI_CLIENT_ID = 'anhedral-cli';
export const SOURCE_LIMITS = {
  bytes: 16 * 1024 * 1024,
  archiveBytes: 24 * 1024 * 1024,
  files: 2000,
  chunkBytes: 1024 * 1024,
} as const;
export const uploadExcluded = /(?:^|\/)(?:\.artifacts|coverage|\.cache|\.DS_Store)(?:\/|$)/;
export const uploadSecret =
  /(?:^|\/)(?:\.aws|\.ssh|\.gnupg|\.npmrc|\.netrc|\.pypirc|credentials(?:\.[^/]*)?|[^/]*\.(?:pem|key|p12|pfx))(?:\/|$)/i;
export const sourceHashSchema = z.string().regex(/^[a-f0-9]{64}$/);
export const cliDeviceSchema = z.object({
  device_code: z.string().min(20).max(191),
  user_code: z.string().min(4).max(40),
  verification_uri: z.url(),
  verification_uri_complete: z.url(),
  expires_in: z.number().int().positive().max(600),
  interval: z.number().int().min(1).max(30),
});
export const cliLoginSchema = z
  .object({
    protocol: z.literal(1),
    token: z.string().regex(/^acl_[a-f0-9]{64}$/),
    expiresAt: z.iso.datetime(),
  })
  .strict();
export const cliLinkSchema = z
  .object({
    protocol: z.literal(1),
    projectId: z.uuid(),
    teamId: z.uuid(),
    principalId: z.uuid(),
    name: z.string().min(1).max(200),
  })
  .strict();
export const sourceUploadInputSchema = z
  .object({
    protocol: z.literal(1),
    requestId: z.uuid(),
    projectId: z.uuid(),
    teamId: z.uuid(),
    archiveDigest: sourceHashSchema,
    archiveBytes: z.number().int().positive().max(SOURCE_LIMITS.bytes),
    inventoryDigest: sourceHashSchema,
    cliVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.-]+)?$/),
    chunks: z.array(sourceHashSchema).min(1).max(16),
  })
  .strict()
  .refine(
    (v) => v.chunks.length === Math.ceil(v.archiveBytes / SOURCE_LIMITS.chunkBytes),
    'Chunk count differs from archive size.',
  );
export const sourceUploadReceiptSchema = z
  .object({
    protocol: z.literal(1),
    id: z.uuid(),
    requestId: z.uuid(),
    projectId: z.uuid(),
    archiveDigest: sourceHashSchema,
    inventoryDigest: sourceHashSchema,
    received: z.array(z.number().int().min(0).max(15)).max(16),
    state: z.enum(['uploading', 'sealed', 'cancelled']),
    expiresAt: z.iso.datetime(),
    sourceRevision: sourceHashSchema.nullable(),
  })
  .strict();
export type SourceUploadInput = z.infer<typeof sourceUploadInputSchema>;

/** Defense in depth only; the server independently validates uploaded source. */
export { sourceContainsCredential } from '../../assets/security/credential-patterns.mjs';

/** Planning reserves source only. It cannot grant a runtime, preview or deployment. */
export const cliPlanInputSchema = z
  .object({
    protocol: z.literal(1),
    requestId: z.uuid(),
    uploadId: z.uuid(),
    manifest: deploymentManifestSchema,
  })
  .strict();
export const cliPlanSchema = z
  .object({
    protocol: z.literal(1),
    id: z.uuid(),
    requestId: z.uuid(),
    projectId: z.uuid(),
    uploadId: z.uuid(),
    digest: sourceHashSchema,
    manifest: deploymentManifestSchema,
    sourceRevision: sourceHashSchema,
    inventoryDigest: sourceHashSchema,
    lockDigest: sourceHashSchema,
    routing: z
      .object({
        generation: z.number().int().nonnegative(),
        activeReleaseId: z.uuid().nullable(),
        desiredReleaseId: z.uuid().nullable(),
      })
      .strict(),
    routingRevision: sourceHashSchema,
    expectedGeneration: z.number().int().nonnegative(),
    policyDigest: sourceHashSchema,
    migrationDigests: z.array(sourceHashSchema).max(100),
    expiresAt: z.iso.datetime(),
    runtimeImage: z.null(),
    configurationRevision: z.null(),
    artifactVerified: z.literal(false),
    hostedAdmission: z.literal(false),
    identityAction: z.literal('preserve'),
    blockers: z.tuple([
      z.literal('HOSTED_ADMISSION_DISABLED'),
      z.literal('ARTIFACT_UNREVIEWED'),
      z.literal('CONFIGURATION_UNVERIFIED'),
    ]),
  })
  .strict();
export const cliPrepareInputSchema = z
  .object({
    protocol: z.literal(1),
    requestId: z.uuid(),
    planId: z.uuid(),
    planDigest: sourceHashSchema,
  })
  .strict();
export const cliPreparationSchema = z
  .object({
    protocol: z.literal(1),
    planId: z.uuid(),
    planDigest: sourceHashSchema,
    candidateId: z.uuid(),
    sourceRevision: sourceHashSchema,
    state: z.enum(['awaiting-runtime', 'building', 'built', 'ready', 'failed']),
    buildDigest: sourceHashSchema.nullable().optional(),
    error: z.string().max(300).nullable().optional(),
    admission: z
      .object({
        policyDigest: sourceHashSchema,
        image: z.string().regex(/^sha256:[a-f0-9]{64}$/),
        scope: z.literal('isolated-build'),
      })
      .strict()
      .nullable()
      .optional(),
    hostedAdmission: z.boolean(),
    identityAction: z.literal('preserve'),
  })
  .strict();

/** Canonical JSON for immutable plan and request digests across SQL JSONB and clients. */
export function canonicalCliJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalCliJson).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, v]) => `${JSON.stringify(key)}:${canonicalCliJson(v)}`)
      .join(',')}}`;
  return JSON.stringify(value);
}
