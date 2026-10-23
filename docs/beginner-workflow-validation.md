# Beginner workflow implementation and validation

The conversational Anhedral skill guides Codex through app requirements, stack selection, construction, resource setup, product implementation, preview and release. The npm package constructs starters and maintains portable progress; the panel displays the app, intended stack relationships, current work, blockers and environment-scoped links. Existing provider tools perform operations. No separate execution service or scheduler was added.

`anhedral.progress.json` is a versioned non-secret record with compare-and-swap revisions and an exclusive writer lock. It keeps independent capability milestones and tool, environment, account and integration observations. Reports include dates, evidence source labels and optional source/config/account/resource identities. Configuration fingerprints identify drift; old evidence cannot replace a newer observation. The record is separate from generated `anhedral.setup.json` requirements and the machine's project registry. Interrupted writers leave a lock for inspection rather than silently risking concurrent edits.

The `anhedral_report_observations` MCP tool returns a complete snapshot through the existing native app bridge. The package API and `anhedral progress` command use the same contract. Generated projects initially record only local starter construction. The overview preserves a successful deployment alongside a failed connectivity or product test and never promotes either to blanket readiness.

## Verification performed

- Repository build, TypeScript checks, hygiene, release policy and static security policy passed.
- All 21 Node test entries passed, including generation/report/resume, separate-process writes, revision conflicts, secret rejection, path boundaries, configuration drift, account/environment distinctions and actual stdio MCP reporting round trips.
- Packed CLI smoke and packlist checks passed; OSV audit passed for 231 unique locked package versions.
- A real official shadcn Next.js + Neon workspace passed lint, typechecking, Fallow, production dependency audit, Next.js build and OpenNext Worker build. This uncovered and fixed an unused database integration and an incompatible schema import. The generated `/api/health` endpoint now performs a read-only database query, closes Neon connections and returns non-secret 503 responses on failure. Its success/failure/cleanup behavior was exercised with explicit runtime fixtures.
- Chrome and local preview checks confirmed readable app/stack layout, independent deployment/database-failure display, scoped links and production separation. Host delivery is tested through stdio MCP and the structured-result bridge; an installed Codex/ChatGPT host session was not independently exercised.

## External acceptance and subsequent work

No provider resources were created, paid plans activated, production releases performed, packages published or marketplace submissions made. Real Neon/Hyperdrive connectivity and deployed product flows remain unverified. Complete the guide's representative reading-list acceptance scenario in explicitly selected client-owned preview accounts, exercising save/reload, failure recovery and deployed access checks before recording those milestones.

The supported plugin route is the local Node stdio runtime. Public cloud ChatGPT delivery still requires a hosted HTTPS MCP endpoint, authentication/access design and app submission; it cannot inspect arbitrary local folders. Choose and authorize that hosting scope before implementing and submitting it.

Broad incremental capability addition remains subsequent work. Existing full overlays replace source/configuration and are unsuitable for edited applications. Add targeted generators with dry-run file plans, semantic conflict detection, edit preservation and transactional commits before offering a general `add` command. Existing applications continue through source inspection and targeted agent edits.
