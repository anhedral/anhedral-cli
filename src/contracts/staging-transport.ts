// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

const digest = z.string().regex(/^[a-f0-9]{64}$/);
export const stagingCreateSchema = z
  .object({
    requestId: z.uuid(),
    candidateId: z.uuid(),
    expectedGeneration: z.number().int().nonnegative(),
  })
  .strict();
export const stagingConfigurationSchema = z
  .object({ snapshotId: z.uuid(), digest, environment: z.literal("staging") })
  .strict();
export const stagingDeploymentSchema = z.object({
  id: z.uuid(),
  developmentId: z.uuid(),
  candidateId: z.uuid(),
  generation: z.number().int().positive(),
  status: z.enum(["queued", "preparing", "ready", "deployed", "failed", "superseded"]),
  summary: z.string().max(2000).nullable(),
  sourceRevision: digest,
  configuration: stagingConfigurationSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const stagingStateSchema = z.object({
  enabled: z.boolean().optional(),
  canDeploy: z.boolean(),
  generation: z.number().int().nonnegative(),
  activeDeploymentId: z.uuid().nullable(),
  desiredDeploymentId: z.uuid().nullable(),
  deployments: z.array(stagingDeploymentSchema).max(30),
});
export type StagingCreate = z.infer<typeof stagingCreateSchema>;
export type StagingDeployment = z.infer<typeof stagingDeploymentSchema>;
export type StagingState = z.infer<typeof stagingStateSchema>;

export const stagingCreateReceiptSchema = z
  .object({
    id: z.uuid(),
    developmentId: z.uuid(),
    candidateId: z.uuid(),
    requestId: z.uuid(),
    generation: z.number().int().positive(),
    configuration: stagingConfigurationSchema,
  })
  .strict();
