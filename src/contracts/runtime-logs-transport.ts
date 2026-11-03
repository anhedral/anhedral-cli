// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

export const runtimeLogEnvironmentSchema = z.enum(["staging", "production"]);
export const runtimeLogLevelSchema = z.enum(["debug", "info", "warn", "error"]);
export const runtimeLogSourceSchema = z.enum(["request", "console", "exception"]);
export const runtimeLogQuerySchema = z
  .object({
    environment: runtimeLogEnvironmentSchema.default("production"),
    deploymentId: z.uuid().optional(),
    level: runtimeLogLevelSchema.optional(),
    source: runtimeLogSourceSchema.optional(),
    range: z.enum(["1h", "24h", "7d"]).default("24h"),
    search: z.string().trim().max(200).default(""),
    cursor: z.string().max(512).optional(),
  })
  .strict();
export const runtimeLogEntrySchema = z
  .object({
    id: z.uuid(),
    requestId: z.uuid(),
    occurredAt: z.string().datetime(),
    deploymentId: z.uuid(),
    artifactId: z.uuid(),
    environment: runtimeLogEnvironmentSchema,
    component: z.enum(["api", "web"]),
    kind: runtimeLogSourceSchema,
    level: runtimeLogLevelSchema,
    message: z.string().max(2048),
    method: z.string().max(16).nullable(),
    status: z.number().int().min(100).max(599).nullable(),
    outcome: z.string().max(80).nullable(),
    durationMs: z.number().min(0).max(300000).nullable(),
    truncated: z.boolean(),
  })
  .strict();
export const runtimeLogPageSchema = z
  .object({
    state: z.enum(["disabled", "unavailable", "ready"]),
    reason: z.string().nullable(),
    environment: runtimeLogEnvironmentSchema,
    coverage: z.literal("dynamic-workers"),
    retentionDays: z.literal(7),
    from: z.string().datetime(),
    to: z.string().datetime(),
    entries: z.array(runtimeLogEntrySchema).max(100),
    nextCursor: z.string().nullable(),
    dropped: z.number().int().nonnegative(),
    lastReceivedAt: z.string().datetime().nullable(),
  })
  .strict();
export type RuntimeLogQuery = z.infer<typeof runtimeLogQuerySchema>;
export type RuntimeLogEntry = z.infer<typeof runtimeLogEntrySchema>;
export type RuntimeLogPage = z.infer<typeof runtimeLogPageSchema>;
