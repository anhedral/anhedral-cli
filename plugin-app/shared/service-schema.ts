import { z } from 'zod';
export const serviceInventorySchema = z
  .object({
    inspectedAt: z.string().datetime({ offset: true }),
    errors: z.array(z.string().max(256)).max(10),
    capabilities: z
      .array(z.object({ name: z.string().max(256), description: z.string().max(1000) }).strict())
      .max(100),
    entries: z
      .array(
        z
          .object({
            id: z.string().max(1024),
            name: z.string().max(256),
            group: z.enum(['Applications', 'Resources', 'Integrations']),
            provider: z.string().max(256),
            kind: z.string().max(256),
            applications: z.array(z.string().max(256)).max(100),
            resourceId: z.string().max(256).nullable(),
            status: z.enum(['Declared', 'Configured', 'Recorded', 'Pending', 'Unavailable']),
            recordedAt: z.string().datetime({ offset: true }).nullable(),
            url: z
              .string()
              .url()
              .refine((value) => {
                const url = new URL(value);
                return (
                  url.protocol === 'https:' &&
                  !url.username &&
                  !url.password &&
                  !url.search &&
                  !url.hash
                );
              })
              .nullable(),
            ownership: z.enum(['created', 'reused', 'unknown']),
            notes: z.array(z.string().max(1000)).max(100),
          })
          .strict(),
      )
      .max(2000),
  })
  .strict();
