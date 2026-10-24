import { z } from 'zod';
import { SERVICE_TOOL_ACTIONS } from '../../../../src/service-model.ts';
export const SERVICE_TOOLS = Object.keys(
  SERVICE_TOOL_ACTIONS,
) as (keyof typeof SERVICE_TOOL_ACTIONS)[];
export type ServiceTool = (typeof SERVICE_TOOLS)[number];
/** Results containing private rows, schema names or confirmation evidence stay app-only. */
export const PRIVATE_SERVICE_TOOLS: readonly ServiceTool[] = [
  'list_service_tables',
  'browse_service_data',
  'plan_service_deletion',
  'delete_service',
];
export const serviceArgumentsSchema = z
  .object({
    id: z.string().uuid().describe('Registered catalog project ID.'),
    key: z
      .string()
      .min(1)
      .max(1024)
      .describe('Exact service entry ID returned by get_project_services.'),
    hours: z
      .union([z.literal(1), z.literal(24), z.literal(168)])
      .optional()
      .describe('Analytics window; D1 requires 24 or 168 hours in complete UTC days.'),
    table: z
      .string()
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]{0,127}$/)
      .optional()
      .describe('Table or metadata view returned by list_service_tables; app-only.'),
    cursor: z
      .string()
      .max(4096)
      .optional()
      .describe('Opaque nextCursor from the prior KV/R2 page; app-only.'),
    offset: z
      .number()
      .int()
      .min(0)
      .max(10000)
      .optional()
      .describe('Database page offset; use returned offset plus page size.'),
    token: z
      .string()
      .regex(/^[a-zA-Z0-9_-]{43}$/)
      .optional()
      .describe('Fresh single-use token from the reviewed deletion plan; app-only.'),
    typedName: z
      .string()
      .min(1)
      .max(256)
      .optional()
      .describe('Exact resource name entered by the user for deletion confirmation; app-only.'),
  })
  .strict();
export type ServiceArguments = z.infer<typeof serviceArgumentsSchema>;
export const serviceResponseSchema = z
  .object({
    status: z
      .object({
        state: z.enum(['available', 'not-found', 'permission-required', 'unavailable']),
        fetchedAt: z.string().datetime(),
        name: z.string().max(256).optional(),
        storageBytes: z.number().int().nonnegative().optional(),
        message: z.string().max(1000),
      })
      .strict()
      .optional(),
    metrics: z
      .object({
        fetchedAt: z.string().datetime(),
        start: z.string().datetime(),
        end: z.string().datetime(),
        timezone: z.literal('UTC'),
        source: z.string().max(256),
        sampled: z.boolean(),
        points: z
          .array(
            z
              .object({
                time: z.string().max(64),
                values: z.record(z.string().max(64), z.number().finite().nonnegative()),
              })
              .strict(),
          )
          .max(1000),
        units: z.record(z.string().max(64), z.string().max(64)),
      })
      .strict()
      .optional(),
    tables: z.array(z.string().max(128)).max(1000).optional(),
    data: z
      .object({
        fetchedAt: z.string().datetime(),
        columns: z.array(z.string().max(256)).max(200),
        rows: z
          .array(
            z
              .array(z.union([z.string().max(1000), z.number().finite(), z.boolean(), z.null()]))
              .max(200),
          )
          .max(100),
        offset: z.number().int().nonnegative(),
        hasMore: z.boolean(),
        masked: z.boolean(),
        nextCursor: z.string().max(4096).optional(),
      })
      .strict()
      .optional(),
    plan: z
      .object({
        token: z.string().regex(/^[a-zA-Z0-9_-]{43}$/),
        name: z.string().max(256),
        accountId: z.string().regex(/^[a-f0-9]{32}$/i),
        resourceId: z.string().max(256),
        kind: z.string().max(64),
        applications: z.array(z.string().max(256)).max(100),
        expiresAt: z.string().datetime(),
        impact: z.string().max(1000),
      })
      .strict()
      .optional(),
    deletion: z
      .object({
        state: z.enum(['deleted', 'uncertain']),
        resourceId: z.string().max(256),
        message: z.string().max(1000),
      })
      .strict()
      .optional(),
  })
  .strict();
export type ServiceResponse = z.infer<typeof serviceResponseSchema>;
