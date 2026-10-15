import { z } from 'zod';
import type { Dashboard, ProjectSummary } from './model.ts';
import type { ProjectInspection } from '../../../../src/inspector-model.ts';
import { isLifecycleOperation } from '../../../../src/lifecycle-model.ts';
const label = z.string().max(256);
const url = z
  .string()
  .url()
  .refine((value) => {
    const parsed = new URL(value);
    return (
      parsed.protocol === 'https:' &&
      !parsed.username &&
      !parsed.password &&
      !parsed.search &&
      !parsed.hash
    );
  })
  .nullable();
const timestamp = z.string().datetime({ offset: true }).nullable();
const operation = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().uuid(),
    target: z.enum(['cloudflare', 'vercel', 'mixed', 'mobile']),
    state: z.enum(['running', 'blocked', 'completed', 'failed']),
    startedAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
    phases: z
      .array(
        z
          .object({
            name: z.string().regex(/^[a-z][a-z-]{0,63}$/),
            state: z.enum(['running', 'completed', 'failed']),
          })
          .strict(),
      )
      .max(100),
  })
  .strict()
  .refine(isLifecycleOperation);
const section = <T extends z.ZodType>(data: T) =>
  z
    .object({
      state: z.enum(['available', 'unavailable']),
      data,
      error: z.string().max(256).optional(),
    })
    .strict();
const release = z
  .object({
    id: label,
    state: label,
    operationState: z.enum(['running', 'checked', 'deployed', 'failed']).optional(),
    commit: label,
    recordedAt: timestamp,
    url,
    kind: z.enum(['deployment', 'build']),
    platform: label.optional(),
    profile: label.optional(),
    artifact: label.optional(),
  })
  .strict();
export const inspectionSchema: z.ZodType<ProjectInspection> = z
  .object({
    schemaVersion: z.literal(1),
    name: label,
    inspectedAt: z.string().datetime({ offset: true }),
    lifecycle: z
      .object({
        supportedConfiguration: z.boolean(),
        init: z
          .object({
            state: z.enum(['configured', 'needs-attention', 'unavailable']),
            message: z.string(),
          })
          .strict(),
        auth: z
          .object({
            state: z.literal('not-checked'),
            providers: z.array(z.string()),
            accounts: z.array(z.object({ provider: z.string(), reference: z.string() }).strict()),
            message: z.string(),
          })
          .strict(),
        ship: z
          .object({
            state: z.enum(['not-recorded', 'recorded', 'needs-attention']),
            successfulTargets: z.number().int().nonnegative(),
            totalTargets: z.number().int().nonnegative(),
            message: z.string(),
          })
          .strict(),
      })
      .strict()
      .optional(),
    authentication: z.object({ state: z.literal('not-checked') }).strict(),
    liveStatus: z.object({ state: z.literal('unknown') }).strict(),
    limits: z.array(z.string().max(500)).max(30),
    selection: section(
      z
        .object({
          cliVersion: label.nullable(),
          products: z.array(label).max(100),
          hosting: z.enum(['cloudflare', 'vercel']).nullable(),
        })
        .strict(),
    ),
    workspaces: section(
      z
        .array(
          z
            .object({
              name: label,
              directory: label,
              dependencies: z
                .array(
                  z
                    .object({
                      name: label,
                      kind: z.enum([
                        'dependencies',
                        'devDependencies',
                        'peerDependencies',
                        'optionalDependencies',
                      ]),
                    })
                    .strict(),
                )
                .max(500),
            })
            .strict(),
        )
        .max(100),
    ),
    configuration: section(
      z
        .object({
          bindings: z
            .array(
              z
                .object({
                  application: label,
                  name: label,
                  kind: label,
                  configured: z.boolean(),
                  identifierRequired: z.boolean(),
                  resourceId: label.nullable(),
                })
                .strict(),
            )
            .max(500),
          schedules: z.array(z.object({ application: label, expression: label }).strict()).max(200),
          environment: z
            .array(
              z
                .object({ application: label, name: z.string().regex(/^[A-Z][A-Z0-9_]*$/) })
                .strict(),
            )
            .max(500),
        })
        .strict(),
    ),
    targets: section(
      z
        .array(
          z
            .object({
              id: label,
              provider: z.enum(['cloudflare', 'vercel', 'expo', 'desktop', 'extension']),
              application: label,
              audience: z.enum(['public', 'private', 'unconfigured', 'not-applicable']),
              accountReference: label.nullable(),
              latestAttempt: release.nullable(),
              lastSuccessful: release.nullable(),
              delivery: z.enum(['implemented', 'artifact-only', 'scaffold-only']),
              liveStatus: z.literal('unknown'),
              error: z.string().max(256).optional(),
            })
            .strict(),
        )
        .max(100),
    ),
    setupProviders: section(
      z
        .array(
          z
            .object({
              id: label,
              managementCredential: label.nullable(),
              ownerSteps: z.array(z.string().max(500)).max(30),
              authentication: z.literal('not-checked'),
              permissions: z.literal('unknown'),
              billing: z.literal('unknown'),
            })
            .strict(),
        )
        .max(20),
    ),
    integrations: section(
      z
        .array(
          z
            .object({
              provider: label,
              operations: z
                .array(
                  z
                    .object({
                      operation: label,
                      status: z.enum(['pending', 'complete']),
                      resources: z.record(z.string(), label),
                      recovery: label,
                      kind: label.nullable(),
                    })
                    .strict(),
                )
                .max(500),
            })
            .strict(),
        )
        .max(20),
    ),
    serviceDeletions: section(
      z
        .array(
          z
            .object({
              resourceId: label,
              kind: label,
              name: label,
              state: z.enum(['pending', 'deleted', 'uncertain']),
              recordedAt: timestamp,
            })
            .strict(),
        )
        .max(500),
    ).optional(),
    cloudflareResources: section(
      z
        .array(
          z
            .object({
              kind: label,
              name: label,
              id: label,
              reused: z.boolean().nullable(),
              createdByProject: z.boolean().nullable().optional(),
              recordedAt: timestamp,
            })
            .strict(),
        )
        .max(500),
    ),
    readiness: section(
      z
        .object({
          localReady: z.boolean(),
          checks: z
            .array(z.object({ id: label, ok: z.boolean(), detail: z.string().max(500) }).strict())
            .max(100),
        })
        .strict(),
    ),
    operation: section(operation.nullable()),
  })
  .strict();
const projectSchema: z.ZodType<ProjectSummary> = z
  .object({
    id: z.string().uuid(),
    name: z.string().min(1).max(80),
    sourceName: label,
    updatedAt: z.string().datetime({ offset: true }),
    products: z.array(label).max(100),
    status: z.enum(['recorded', 'source', 'unavailable']),
    message: z.string().max(500).optional(),
    inspection: inspectionSchema.optional(),
  })
  .strict();
export const dashboardSchema: z.ZodType<Dashboard> = z
  .object({
    projects: z.array(projectSchema).max(200),
    selectedId: z.string().uuid().nullable(),
    preferences: z.object({ view: z.enum(['list', 'grid']) }).strict(),
  })
  .strict();
