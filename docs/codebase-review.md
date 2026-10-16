# CLI and generated application review

Reviewed 2026-10-16 against the uncommitted 0.11.1 checkout. This report describes the current source and local evidence, not a published release. Backward compatibility and upgrades of existing projects are explicitly outside the owner's requirements.

## Review process

Four independent review tracks examined CLI and registry contracts, generated applications, delivery/provider recovery, and repository/plugin/release cohesion. A second stage cross-reviewed the changes across tracks. A final stage checked command grammar, public exports, generated guidance, removed compatibility paths, runtime prerequisites and packaging policy together.

The review covered command parsing/help/JSON failures, registry selection and staged additions, workspace composition, web/API/native/extension recipes, shared database/auth packages, environment conventions, dependency patches, current Cloudflare engines, provider receipts and credential separation, partial operations, deployment/rollback/recovery evidence, project catalog, inspector/MCP, CI, release verification and package contents. Existing structural suites exercise generated combinations; they do not establish every runtime integration.

## Completed corrections

| Area | Current behavior |
| --- | --- |
| Dependency patches | A generic installer owns the exact pnpm patches. Generated audit policy verifies only reviewed advisory/version pairs, effective patch configuration and patch hashes. Installed-package/runtime regressions belong to repository tests. Generated guidance now describes that boundary accurately. |
| First Cloudflare app added to a native workspace | The selected runtime determines the actual Void or Wrangler output. Configuration, root Node engine, documentation and delivery manifest agree. A previously registered zero-target workspace keeps its identity, account and audience when selecting its first engine. |
| One project configuration | Root metadata now lives in `anhedral.json`: identity, standard, setup, registry, provider settings and selected Cloudflare/Vercel sections. Old filenames are not read. Section updates preserve unrelated settings, share the source transaction lock, and retain edit/concurrency protection through separate configuration fingerprints. The local full-stack example uses this same format. |
| Current delivery manifest | `deliveryEngine` is explicit and validated. Registration validates the current setup plan before writing application state. Missing/unknown engine markers and incomplete setup plans fail without rewriting the manifest. |
| CLI grammar | `init [directory]` is the initialization command. `add <items...>` operates in the current project; `--cwd <directory>` selects another project. The `new` compatibility alias and ambiguous positional add-directory parser are removed from help, implementation, examples and test harnesses. |
| Compatibility remnants | Removed the Wrangler-to-Void migration planner, `voidCandidate` outputs, old provider journal migration, catalog import shim and historical CLI-only release-verification fallback. Unsupported saved formats fail rather than being converted. |
| Current Wrangler profiles | Explicit OpenNext, Queues/dead-letter recovery and Basin selections retain the required Wrangler implementation. Those are current supported selections. Additions do not mix engines or relocate existing runtime ownership. |
| Project catalog | Private schema fields, files, locks and the default directory consistently use `projects`. Catalog registration, inspector startup, MCP fixtures and documentation agree; no old catalog migration is retained. |
| Toolchain policy | Generation, setup and diagnostics share Node eligibility and engine selection. Doctor requires the exact pnpm pin. Root and inspector Node type-definition update rules are scoped independently. |
| Root verification prerequisites | Unit tests verify/reuse the inspector runtime or prepare its frozen dependencies and rebuild it. Packaging cannot accept a stale source digest. |
| Service operations | CLI and MCP share one dispatcher. Receipt-only selectors are discoverable, KV follows provider cursors, and D1/Neon browsing uses bounded projections, SQL masking and explicit ordering. Offset pages remain subject to concurrent writes. |
| Neon migration handoff | Runtime provisioning does not put pooled credentials into the migration package. Guidance requires separate direct migration credentials and reviewed SQL. |
| Optional Neon Realtime | `--neon-realtime` selects Neon consistently with Better Auth and adds separate server/client factories for sealed live queries. Durable Object rooms retain `--realtime`. Branch activation is manual; the beta has no RLS. SDK source sealing checks and generated composition pass; live subscriptions and a fresh published SDK installation remain unverified. See the dated record in `docs/verification.md`. |
| Provider naming | Vercel names are normalized and bounded independently of package/directory names. |
| Disposable runtime state | Source receipts and addition transactions exclude Void/Vinext caches, generated Wrangler configuration and app migration mirrors. Authored database files and shared reviewed SQL remain source. |
| Process execution | Generator commands have bounded execution. Preview tests register lifecycle listeners immediately, bound output/startup/build/HTTP waits, and terminate descendant processes with forced cleanup when necessary. |
| Generated development ports | Void backend Vite configurations use their declared per-app inspector ports and strict HTTP ports. Generated routing instructions identify the actual Worker entry adapter. |
| Generated acceptance wiring | Generated-profile checks invoke a compiled-handler SQLite auth gate and fresh Void build/preview acceptance. The isolated D1/Better Auth API profile additionally applies local migrations and exercises signup, login, session retrieval, incorrect-password rejection and revocation with temporary credentials and a matching local origin. |
| Plugin completeness | Packaging requires the current skill, references, MCP entrypoint, manifest assets and verified runtime. Missing MCP configuration cannot bypass runtime verification. |
| Public and server environment | Vinext maps `NEXT_PUBLIC_*` during builds; Vite clients use `VITE_*`. Production public values belong in the build environment. Protected local server values can be sent to `void secret` via stdin; dotenv files remain private and untracked. |
| Release identity | Verification requires both CLI and matching plugin archives. Canonical documentation is regenerated into the bundled plugin references. The immutable marketplace `plugins/anhedral` release-tree path remains a consumer contract. Bundled guide filenames now match the canonical `stack-standard.md` and `software-factory.md`. |

The cross-reviews found no further confirmed defect in the reviewed changes. That is a source-review result, not proof that every supported combination is production-ready.

## Verification for this pass

| Check | Result |
| --- | --- |
| CLI build | Passed |
| Full CLI unit suite | 668 passed, two skipped, zero failures; 670 total |
| Focused CLI grammar/readiness/addition tests | 30 passed |
| Delivery/provider focused suite | 174 passed before final consolidation; covered again by the full suite |
| Root lint | Passed: type checking, formatting, source hygiene and release policy |
| Static security policy | Passed |
| Offline patch installation/runtime regressions | Passed for braces and node-forge |
| Package allowlist | Passed: 214 files |
| Inspector | Type checking/build passed; 61 tests passed; one listener test blocked by `listen EPERM` on `127.0.0.1` |
| Fresh packed CLI installation | Offline attempt blocked by `ENOTCACHED` for `@neondatabase/serverless` in the smoke test's isolated empty npm cache |
| Fresh generated API build and compiled handlers | Passed with current generator overlays and version-checked cached dependency links: Vite build, health/OpenAPI, and real Better Auth/Drizzle SQL/session flow against in-memory SQLite. This used the bootstrap fixture, not a new upstream download or fresh dependency installation. |
| Generated workerd/type generation | Workerd preview remains unexecuted; Wrangler runtime type generation attempted and blocked by `listen EPERM`. |
| Complete local release candidate | CLI tarball/plugin ZIP created together, independently integrity-verified and secret-scanned; not published or installed. |
| Hosted generated matrix, browser flows and live providers | Not established for this uncommitted candidate |
| Current external advisory databases | Not refreshed in this pass |

The listener and empty-cache failures are environment limitations, not proven application defects. Earlier dated local/provider results in `docs/void-verification.md` apply to their recorded source and do not substitute for testing this candidate.

## Remaining acceptance work

1. Run the complete hosted OS/Node and generated-profile matrices against the intended commit, including the newly wired local auth path and inspector browser tests.
2. Establish a fresh packed dependency installation and refresh external advisory results for that candidate.
3. Exercise private first deployment, committed resource-lock reuse from a fresh checkout, partial deployment recovery, and provider-confirmed rollback with the intended customer accounts and Access permissions.
4. For an implemented product, verify protected business data, denied users, tenant isolation and any cross-app/native/extension identity flows. The scaffold's auth session smoke does not implement or certify those product behaviors.

No provider resources, publication, production deployment or source commit were performed during this review. Detailed local evidence and prior pass results are recorded in `docs/verification.md`.
