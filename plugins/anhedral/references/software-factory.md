# Scaffold workflow

Anhedral CLI creates a foundation; consumers develop and operate it themselves. See stack-standard.md for architectural ownership.

1. Inspect an empty destination. Preview `anhedral init my-app --dry-run --json`.
2. Run `anhedral init my-app`, or `--skip-install --no-git` for offline source generation.
3. Review README.md, AGENTS.md, anhedral.json, environment examples and Wrangler configuration. Follow the recorded Node and pnpm versions.
4. Run `pnpm dev` and open the address printed by the server. New projects contain only the web app. Add other clients only when required.
5. Use `anhedral ui list/add/diff/doctor` to extend source-owned UI; see [UI commands](ui.md). Develop features and run `pnpm check`.
6. Use `anhedral add` to compose selected [stack capabilities](capabilities.md), inspect the dry-run plan, configure the selected auth methods/providers and validate the consumer. Cloudflare, Stripe and RevenueCat Codex plugins can assist when installed and explicitly invoked; they are separate products with their own credentials and workflows.

The CLI does not manage provider access, billing, infrastructure, deployments, releases or production acceptance. Generated Wrangler/OpenNext configuration and explicit database migration scripts remain editable consumer tooling.

## Maintaining the scaffold

Preserve generated-consumer tests, source-generation safety, pinned dependencies, UI provenance, licenses and immutable release packaging. Check emitted source and the actual packed npm artifact. Preserve docs/verification.md as dated evidence. Keep one focused behavior per topic branch from staging; promote stable releases through main. A build does not publish npm or install a plugin.

The Codex plugin ships skills and stack references only. It has no MCP server, project catalog, dashboard or provider credentials. Package validation checks the skills, references, versions and absence of a managed runtime.

## Next/OpenNext runtime regression gate

Relevant web generator, build dependency and runtime-harness PRs automatically compile one isolated generated foundation and run it in local workerd. The smoke verifies prerendered homepage output, dynamic SSR/RSC, a synthetic Server Action and cookie round-trip, static asset cache headers; Hono service binding is covered separately by the retained proxy contract tests. Synthetic routes exist only in the test workspace. It never deploys or migrates a configured database. Run `pnpm test:next-runtime` locally.

The gate retains `.artifacts/next-runtime/{bundle,smoke}.json` for one day. Its initial 4 MiB gzip budget sums emitted Worker JS/Wasm modules individually, lists the largest modules, and fails when exceeded. This is a source artifact regression ceiling, not provider upload size, memory consumption or cold-request latency. Review measurement changes before adjusting the ceiling.

New public homepages are prerenderable; request-dependent routes opt into dynamic rendering where needed. Generated `public/_headers` caches fingerprinted Next assets immutably; ordinary assets retain platform revalidation. Authenticated responses continue to require private/no-store policy. Existing apps must adopt generator changes explicitly.
