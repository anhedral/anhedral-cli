import { z } from "zod";
import { environmentId, nonSecretText } from "./assembly.js";
const text = (limit: number) => nonSecretText.pipe(z.string().trim().min(1).max(limit));
const link = z.string().max(2000);
export const reportInput = {
  projectId: z.string().regex(/^[a-f0-9]{16}$/),
  expectedRevision: z.number().int().nonnegative(),
  appName: text(100).optional(),
  selected: z.array(text(80)).max(40).optional(),
  hosting: z.enum(["cloudflare", "vercel"]).optional(),
  nextAction: nonSecretText.pipe(z.string().max(1000)).optional(),
  links: z.object({ environment: environmentId.optional(), preview: link.optional(), live: link.optional() }).strict().optional(),
  observations: z.array(z.object({
    capability: text(80),
    environment: environmentId,
    milestone: z.enum(["declared", "generated", "provisioned", "connected", "tested", "deployed"]),
    status: z.enum(["pending", "succeeded", "failed", "blocked"]),
    summary: text(1000),
    evidence: z.array(text(500)).max(12),
    observedAt: z.string().datetime(),
    source: z.enum(["agent-reported", "provider-verified", "local-check"]),
    identity: z.object({ gitRevision: text(100).optional(), configDigest: text(100).optional(), resourceId: text(200).optional(), accountId: text(200).optional() }).strict().optional(),
  }).strict()).max(100).optional(),
  discoveries: z.array(z.object({
    kind: z.enum(["tool", "local-environment", "account", "integration"]),
    name: text(100),
    status: z.enum(["available", "unavailable", "unknown"]),
    scope: text(200),
    summary: text(1000),
    observedAt: z.string().datetime(),
  }).strict()).max(100).optional(),
};
