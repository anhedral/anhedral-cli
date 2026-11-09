import { z } from 'zod';
import { cliLinkSchema, sourceUploadInputSchema } from '../contracts/cli-transport.js';
export const linkSchema = cliLinkSchema.extend({ origin: z.string() }).strict();
export const uploadState = z
  .object({
    origin: z.string(),
    principalId: z.uuid(),
    input: sourceUploadInputSchema,
    uploadId: z.uuid().optional(),
  })
  .strict();
