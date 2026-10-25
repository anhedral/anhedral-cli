# Scaffold workflow

Anhedral CLI creates a foundation; consumers develop and operate it themselves. See stack-standard.md for architectural ownership.

1. Inspect an empty destination. Preview `anhedral init my-app --dry-run --json`.
2. Run `anhedral init my-app`, or `--skip-install --no-git` for offline source generation.
3. Review README.md, AGENTS.md, anhedral.json, environment examples and Wrangler configuration. Follow the recorded Node and pnpm versions.
4. Run `pnpm dev` and open the address printed by the server. Start Expo separately using `pnpm --dir apps/mobile start` and configure its reachable API origin.
5. Develop application features, implement authorization before exposing private data, and run `pnpm check`.
6. Choose and configure your own authentication, integrations and hosting. Cloudflare, Stripe and RevenueCat Codex plugins can assist when installed and explicitly invoked; they are separate products with their own credentials and workflows.

The CLI does not manage provider access, billing, infrastructure, deployments, releases or production acceptance. Generated Wrangler/OpenNext configuration and explicit database migration scripts remain editable consumer tooling.

## Maintaining the scaffold

Preserve generated-consumer tests, source-generation safety, pinned dependencies, UI provenance, licenses and immutable release packaging. Check emitted source and the actual packed npm artifact. Preserve docs/verification.md as dated evidence. Keep one focused behavior per topic branch from staging; promote stable releases through main. A build does not publish npm or install a plugin.

The Codex plugin ships skills and stack references only. It has no MCP server, project catalog, dashboard or provider credentials. Package validation checks the skills, references, versions and absence of a managed runtime.
