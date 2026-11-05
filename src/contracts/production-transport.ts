// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

const productionDigest = z.string().regex(/^[a-f0-9]{64}$/);
export const productionCreateSchema = z
  .object({
    requestId: z.uuid(),
    candidateId: z.uuid(),
    name: z
      .string()
      .min(3)
      .max(48)
      .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/),
    expectedGeneration: z.number().int().nonnegative(),
  })
  .strict();
export const productionConfigurationSchema = z
  .object({
    snapshotId: z.uuid(),
    digest: productionDigest,
    environment: z.literal("production"),
  })
  .strict();
export const productionCreateReceiptSchema = z
  .object({
    id: z.uuid(),
    developmentId: z.uuid(),
    candidateId: z.uuid(),
    requestId: z.uuid(),
    generation: z.number().int().positive(),
    configuration: productionConfigurationSchema,
  })
  .strict();
export const productionDeploymentSchema = z
  .object({
    id: z.uuid(),
    developmentId: z.uuid(),
    candidateId: z.uuid(),
    requestId: z.uuid(),
    generation: z.number().int().positive(),
    status: z.enum(["queued", "preparing", "ready", "published", "failed", "superseded"]),
    sourceRevision: productionDigest,
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();
export const productionStateSchema = z
  .object({
    enabled: z.boolean().optional(),
    canDeploy: z.boolean(),
    requiresIndependentApproval: z.boolean(),
    generation: z.number().int().nonnegative(),
    activeDeploymentId: z.uuid().nullable(),
    desiredDeploymentId: z.uuid().nullable(),
    deployments: z.array(productionDeploymentSchema).max(30),
  })
  .strict();
export type ProductionCreate = z.infer<typeof productionCreateSchema>;
export type ProductionCreateReceipt = z.infer<typeof productionCreateReceiptSchema>;
export type ProductionState = z.infer<typeof productionStateSchema>;
