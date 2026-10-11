# Bundled registry content audit

Anhedral Init 0.10.1 keeps one maintained, bundled catalog. The audit covers all 27 selectable products and four shared foundations, their generated source, manifests, environment examples, setup metadata, and composition rules. External registries remain unsupported.

## Corrections

Clerk on Hono now generates the advertised shared authentication package, requires both backend keys and explicit authorized origins, and leaves product authorization to the application. Web Clerk pages include Suspense boundaries required by Next.js cache components; their middleware has an explicit portable type. [Clerk request authentication](https://clerk.com/docs/reference/backend/authenticate-request) and [Next.js navigation hook boundaries](https://github.com/vercel/next.js/blob/canary/errors/blocking-prerender-client-hook.mdx) define these integration requirements.

Environment examples merge rather than replace previous values. Web auth and production previews use port 3000; the browser extension uses 3001. Five Worker applications have distinct HTTP and inspector ports, so concurrent development does not collide. Neon migration tooling loads its local environment explicitly. Generated runtime dependencies correspond to actual imports.

Expo and WXT consume one styling package with shared light/dark tokens and a Tailwind preset. Platform-specific NativeWind and extension behavior remains separate. Runtime package versions are centralized and checked with TypeScript syntax analysis. Generated projects require Node 22.13 or later on the 22.x line, or Node 24 or later; older supported CLI runtimes can still inspect plans and run doctor.

Provider names remain deterministic and fit the common 63-character resource limit, including long or punctuated project names. Source labels are serialized as strings. Generated stack documentation is refreshed on incremental additions; customer README and architecture documents are preserved.

Project JSON reads are bounded to 2 MiB and reject nonregular files without blocking on FIFOs. Parse failures do not disclose JSON values. Doctor identifies incompatible recorded CLI versions before stricter catalog validation. Realtime messages enforce a 16 KiB UTF-8/binary limit and broadcast once to each other peer. Public realtime and workflow entrypoints remain disabled pending product authorization.

Dependency auditing retains the unmodified pnpm report. Its summary is reconciled against affected versions, including multiple versions under one advisory; missing or duplicated version details fail. Reviewed backports still require matching patch hashes, installed bytes and behavioral regression checks. Unremediated high/critical findings block checks. Lower-severity findings remain visible; legacy native-tool dependencies are not forced through incompatible major upgrades.

## Catalog coverage

| Layer | Bundled options | Verification boundary |
| --- | --- | --- |
| Foundations | workspace, typescript, eslint, ui | Task graph, shared configurations, dependency and source ownership |
| Applications | vinext, next, hono, expo, electron, wxt | Real compilation and builds; Next.js on Vercel and OpenNext on Workers |
| Data and identity | neon, d1, local-data, clerk, better-auth | Schemas, environment placement, package imports, identity starters |
| Worker services | r2, kv, realtime, queues, cron, workflows, workers-ai, basin | Binding names and ownership, Worker builds, concurrent local startup |
| AI and communication | openai, ai-sdk, resend | Server-only factories and SDK exports |
| Billing and analytics | stripe, revenuecat, sentry, posthog | Factories, entitlement guidance, platform integration boundaries |
| Styling | styling | Shared tokens and presets used by native and extension clients |

Generation tests exercise 162 valid single-option selections across seven application/hosting bases, checking syntax, workspace references, declared destinations, environment placement and generated documentation. A further 2,457 pair selections check deterministic resolution or an explicit rejection. These tests cover every selectable product; they do not enumerate every possible larger product subset.

The real dependency/build matrix has 18 profiles: web, web-auth, vercel, vercel-auth, cloudflare, api, api-neon, desktop, extension, mobile, worker-services, worker-ai-sdk, api-clerk, web-clerk, vercel-clerk, cloudflare-auth, vercel-services and clients. CI runs every profile on Node 22.13 and 24.18, plus macOS Electron packaging. The API/Neon profile also exercises incremental R2 and WXT addition. Service-heavy and combined-client profiles test interactions beyond pair planning.

## Complexity and source quality

Source is TypeScript; verification uses `pnpm test:all`, generated-project `pnpm check`, and the profile runner. Complexity Optimizer's scanner and Fallow's graph audit were used as leads, then checked against owning source and behavioral tests. Source was modified under the requested implementation scope.

| Location | Finding and change | Complexity and risk | Evidence |
| --- | --- | --- | --- |
| `src/scaffold/services.ts`, generated `Room.webSocketMessage` | Removed intermediate peer filtering; retained sender exclusion and byte limit | O(peers) before/after, fewer allocations; low risk | UTF-8/binary limit and exact fan-out tests; real Worker build |
| `src/registry/resolve.ts`, `resolveStackRegistry` | Retained indexed dependency graph; separated contextual edge construction from traversal | O(V + E), appropriate for 31 items; low risk | Single-option and pair resolution matrix, cycles/conflicts/ownership tests |
| `src/scaffold/workspace.ts`, `writeStandardRoot` | Separated security overrides and Turbo configuration from root composition | Linear in selected items/environment keys, unchanged; low risk | Generation matrix and real stack checks |
| `src/scaffold/files.ts`, `readJson` | Bounded reads before parsing instead of unbounded reads | O(bytes), bounded to 2 MiB; deliberate input limit | Oversize, directory, FIFO and malformed-input subprocess tests |
| `src/registry/add.ts`, receipt discovery | Excluded derived audit report from source ownership | Linear traversal, unchanged; low risk | Existing transaction/add tests and incremental integration profile |

Fallow reports zero changed-code dead-code issues and zero duplication groups. Its estimated-coverage complexity gate still flags branching in registry, readiness, transaction and documentation orchestration; those scores are maintenance signals, not measured runtime performance or actual test coverage. Root composition and graph traversal were clarified where useful. No suppressions or fabricated coverage were added to hide the remaining heuristic findings.

## Acceptance limits

Builds use synthetic Clerk public configuration and do not establish live identity sessions. Worker builds and local denial checks do not provision providers or prove deployed authorization. Expo web export and unsigned Electron packaging do not establish device acceptance, signing or notarization. Native Windows web bootstrap remains explicitly blocked pending upstream support. Generated capabilities are starters: resource access, billing webhooks, persistence adapters, monitoring initialization and product behavior require the documented setup and acceptance checks.

The release must pass source/type/format/security checks, 106 unit tests, packed-CLI and package allowlist checks, the full CI profile matrix, and exact release-artifact verification before publication.
