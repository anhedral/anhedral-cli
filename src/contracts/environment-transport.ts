// SPDX-License-Identifier: Apache-2.0
import { z } from "zod";

export const projectEnvironmentSchema = z.enum(["staging", "production"]);
export const environmentNameSchema = z.string().regex(/^[A-Z][A-Z0-9_]{0,127}$/);
const versionSchema = z.number().int().min(0).max(2147483646);
const reserved =
  /^(ANHEDRAL_|CLOUDFLARE_|CF_|NODE_|npm_|PNPM_|PATH$|HOME$|PORT$|DATABASE_URL$|DB$|FILES$|ASSETS$|AUTH_SECRET$|BETTER_AUTH_|PUBLIC_APP_URL$|WORKER_SELF_REFERENCE$|RESOURCES$)/i;
export const environmentWriteSchema = z
  .object({
    name: environmentNameSchema,
    environment: projectEnvironmentSchema,
    kind: z.enum(["secret", "config"]),
    value: z.string().min(1).max(16384),
    note: z.string().max(500).default(""),
    expectedVersion: versionSchema,
  })
  .strict()
  .superRefine((input, ctx) => {
    if (reserved.test(input.name))
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "This name is reserved for managed runtime configuration.",
      });
    if (input.kind === "secret" && /^(NEXT_PUBLIC_|VITE_|PUBLIC_|EXPO_PUBLIC_)/.test(input.name))
      ctx.addIssue({
        code: "custom",
        path: ["name"],
        message: "Public variables cannot contain secrets.",
      });
  });
export const environmentDeleteSchema = z
  .object({
    name: environmentNameSchema,
    environment: projectEnvironmentSchema,
    expectedVersion: versionSchema.refine((value) => value > 0),
  })
  .strict();
export const environmentImportSchema = z
  .object({
    requestId: z.uuid(),
    environment: projectEnvironmentSchema,
    variables: z
      .array(
        z
          .object({
            name: environmentNameSchema,
            kind: z.enum(["secret", "config"]),
            value: z.string().min(1).max(16384),
            note: z.string().max(500).default(""),
            expectedVersion: versionSchema,
          })
          .strict(),
      )
      .min(1)
      .max(128),
  })
  .strict()
  .superRefine((input, ctx) => {
    const names = new Set<string>();
    input.variables.forEach((variable, index) => {
      if (names.has(variable.name))
        ctx.addIssue({
          code: "custom",
          path: ["variables", index, "name"],
          message: "Variable names must be unique.",
        });
      names.add(variable.name);
      const parsed = environmentWriteSchema.safeParse({
        ...variable,
        environment: input.environment,
      });
      if (!parsed.success)
        for (const issue of parsed.error.issues)
          ctx.addIssue({
            code: "custom",
            path: ["variables", index, ...issue.path],
            message: issue.message,
          });
    });
    if (new TextEncoder().encode(JSON.stringify(input)).length > 65536)
      ctx.addIssue({ code: "custom", message: "Imports support at most 64 KiB." });
  });
export const environmentImportReceiptSchema = z
  .object({
    requestId: z.uuid(),
    imported: z
      .array(
        z
          .object({
            name: environmentNameSchema,
            kind: z.enum(["secret", "config"]),
            environment: projectEnvironmentSchema,
            version: z.number().int().positive(),
          })
          .strict(),
      )
      .max(128),
  })
  .strict();
export type EnvironmentImport = z.infer<typeof environmentImportSchema>;

export type EnvironmentWrite = z.infer<typeof environmentWriteSchema>;
export type EnvironmentDelete = z.infer<typeof environmentDeleteSchema>;
export const environmentMetadataSchema = z
  .object({
    variables: z
      .array(
        z
          .object({
            name: environmentNameSchema,
            environment: projectEnvironmentSchema,
            kind: z.enum(["secret", "config"]),
            version: z.number().int().positive(),
            note: z.string().max(500),
          })
          .strict(),
      )
      .max(512),
  })
  .strict();
export type EnvironmentMetadata = z.infer<typeof environmentMetadataSchema>;
