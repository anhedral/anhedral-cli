import { CATALOG } from "./assembly.js";
import { progressFreshness, type ProgressIdentity, type ProjectProgress } from "../../../src/progress.js";

/** Plan relationships describe intended use, never independently verified connectivity. */
export function stackOverview(selected: string[], work: ProjectProgress | null, environment: string, identity: ProgressIdentity = {}, cloudflareAccountId?: string) {
  const cloudflarePieces = new Set(["hono", "d1", "r2", "kv", "realtime", "queues", "cron", "workflows", "workers-ai", "basin", "containers", "email-routing", "email-sending", ...(work?.hosting === "cloudflare" ? ["next"] : [])]);
  const observations = (work?.observations.filter((item) => item.environment === environment) || []).map((item) => {
    const current = { ...identity, ...(cloudflareAccountId && cloudflarePieces.has(item.capability) ? { accountId: cloudflareAccountId } : {}) };
    // A missing baseline cannot establish drift or identity continuity.
    const comparable = Object.fromEntries(Object.entries(current).filter(([key]) => item.identity?.[key as keyof ProgressIdentity] !== undefined));
    return { ...item, freshness: progressFreshness(item, { identity: comparable }), identityRecorded: !!item.identity?.gitRevision || !!item.identity?.configDigest };
  });
  const nodes = selected.map((id) => {
    const definition = CATALOG.find((item) => item.id === id);
    const milestones = observations.filter((item) => item.capability === id);
    const issue = milestones.find((item) => item.status === "failed" || item.status === "blocked");
    return {
      id,
      group: definition?.group || "Services",
      purpose: definition?.purpose || id,
      milestones,
      issue,
    };
  });
  const interfaces = nodes.filter((node) => node.group === "Interfaces");
  const api = interfaces.find((node) => node.id === "hono");
  const edges: { from: string; to: string; label: string }[] = [];
  for (const app of interfaces) {
    if (api && app.id !== api.id) edges.push({ from: app.id, to: api.id, label: "Application API" });
    for (const service of nodes.filter((node) => node.group !== "Interfaces")) {
      if (api && app.id !== api.id && ["Data", "Processing", "AI", "Billing", "Domain & mail"].includes(service.group)) continue;
      edges.push({ from: app.id, to: service.id, label: service.group === "Data" ? "Reads and writes" : service.group === "Identity" ? "Signs users in" : "Uses" });
    }
  }
  return { nodes, edges, observations, issues: observations.filter((item) => item.status === "failed" || item.status === "blocked"), needsRecheck: observations.filter((item) => item.freshness !== "current") };
}
