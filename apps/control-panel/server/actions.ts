import { z } from "zod";
import {
  planInput,
  progressInput,
  pieceInput,
  environmentId,
  validatePlan,
} from "../shared/assembly.js";
import { draftInput, projectFor, readProjectFile } from "./projects.js";
import { reportInput } from "../shared/report.js";
import { readProjectProgress, updateProjectProgress } from "../../../src/progress.js";
import {
  createDraft,
  savePlan,
  recordProgress,
  recordPiece,
  snapshot,
} from "./status.js";
const scope = {
  projectId: z.string().regex(/^[a-f0-9]{16}$/),
  environment: environmentId.default("default"),
  revision: z.number().int().nonnegative(),
};
export const lifecycleActions = {
  anhedral_report_observations: {
    title: "Update application progress",
    description: "Record non-secret, dated observations from actual work in the registered project’s portable anhedral.progress.json. Use work.revision (or 0 for a missing record), distinct environment/account identities and independent capability milestones. Source labels describe the evidence reported by the agent; the tool does not verify providers or execute commands. Returns the updated live app overview. Never record credentials or infer available tools/authentication from installed plugins.",
    schema: z.object(reportInput).strict(),
    run: async (input: unknown) => {
      const { projectId, ...update } = z.object(reportInput).strict().parse(input);
      const project = projectFor(projectId);
      if (project.planned) throw new Error("Initialize and register the planned folder before recording portable observations.");
      readProjectFile(project.root, "anhedral.progress.json");
      const existing = readProjectProgress(project.root);
      const planned = existing ? undefined : (await snapshot(projectId)).assembly;
      if (update.selected || update.hosting) validatePlan(update.selected || existing?.selected || planned?.selected || [], update.hosting || existing?.hosting || planned?.hosting || "cloudflare");
      await updateProjectProgress(project.root, {
        ...(!existing ? { selected: planned?.selected || [], hosting: planned?.hosting, appName: project.name } : {}),
        ...update,
      });
      return snapshot(projectId, update.observations?.[0]?.environment || update.links?.environment || "default");
    },
  },
  anhedral_create_project: {
    title: "Plan a new Anhedral project",
    description:
      "Save a new project brief, unused absolute target folder and selected stack in local state. Does not create code, accounts, infrastructure or grant spending/release authority. Register the initialized folder with this draftId after implementation.",
    schema: z.object(draftInput).strict(),
    run: async (input: unknown) =>
      snapshot(createDraft(z.object(draftInput).strict().parse(input)).id),
  },
  anhedral_plan_stack: {
    title: "Update the selected stack",
    description:
      "Save a validated, project/environment-specific stack plan using its current revision. Changed scope resets lifecycle evidence. Optional services are not activated; does not provision or modify code.",
    schema: z.object({ ...scope, ...planInput }).strict(),
    run: async (input: unknown) => {
      const { projectId, environment, revision, ...plan } = z
        .object({ ...scope, ...planInput })
        .strict()
        .parse(input);
      validatePlan(plan.selected, plan.hosting);
      const before = await snapshot(projectId, environment);
      if (before.assembly?.revision !== revision) throw new Error("The plan changed. Refresh before saving.");
      const project = projectFor(projectId);
      if (!project.planned) {
        readProjectFile(project.root, "anhedral.progress.json");
        const work = readProjectProgress(project.root);
        if (work) await updateProjectProgress(project.root, { expectedRevision: work.revision, ...plan });
      }
      try { savePlan(projectId, environment, revision, plan); }
      catch (error) { throw new Error(`The portable plan was saved, but the workspace plan changed concurrently. Refresh and reconcile the plan before continuing. ${error instanceof Error ? error.message : ""}`); }
      return snapshot(projectId, environment);
    },
  },

  anhedral_record_piece: {
    title: "Record selected stack-piece progress",
    description:
      "Record a selected piece's actual configured, local, preview or release state and non-secret evidence. Scope is the project and environment with its latest revision. Requires evidence for progress; released requires completed release verification. Reports do not independently verify providers. Never store credentials.",
    schema: z.object({ ...scope, ...pieceInput }).strict(),
    run: async (input: unknown) => {
      const { projectId, environment, revision, ...progress } = z
        .object({ ...scope, ...pieceInput })
        .strict()
        .parse(input);
      recordPiece(projectId, environment, revision, progress);
      return snapshot(projectId, environment);
    },
  },
  anhedral_record_progress: {
    title: "Record lifecycle evidence",
    description:
      "Update the current project's checklist after actual work or a blocker. Use the current revision, non-secret summary and evidence references. Complete the step’s prerequisites first; done requires evidence. These are agent reports, not independent provider or product verification. Reopening a step invalidates downstream evidence. Never store credentials or assume production/spending authorization.",
    schema: z.object({ ...scope, ...progressInput }).strict(),
    run: async (input: unknown) => {
      const { projectId, environment, revision, ...progress } = z
        .object({ ...scope, ...progressInput })
        .strict()
        .parse(input);
      recordProgress(projectId, environment, revision, progress);
      return snapshot(projectId, environment);
    },
  },
};
