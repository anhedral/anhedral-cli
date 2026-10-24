# Developing Anhedral

This repository owns the Anhedral CLI, source generators and skills-only Codex plugin. Read [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) and the relevant section of [docs/software-factory.md](docs/software-factory.md) before changing them. Generated application conventions do not describe this repository's package layout.

- For maintenance, follow [evidence and review practices](docs/software-factory.md#evidence-driven-maintenance). Inspect current Git state and preserve unrelated work. Static findings identify candidates; verify runtime entrypoints, published exports, generated consumers and operational safeguards before deletion.
- Edit canonical documents in `docs/`; `pnpm build` refreshes bundled plugin references. Edit generated application guidance in `src/scaffold/documentation.ts`. Change the shipped skills in `plugins/codex/distribution/skills/anhedral-*/SKILL.md`; a local build does not update an installed plugin.
- Use `pnpm build` before tests that import `dist/`. Run focused `node --test tests/<affected>.test.mjs` checks during development, plus `pnpm typecheck` and relevant format/hygiene checks. Use the factory's full checks for release; document unavailable checks instead of weakening them.
- Keep one behavior or cleanup rationale per reviewable change. Report evidence, affected contracts and validation limits. Record dated results in `docs/verification.md`; keep enduring instructions here short and specific to demonstrated needs.

- Use short-lived `codex/<topic>` branches from `staging`, with one behavior per PR into `staging`. `main` accepts focused release PRs from `staging`; merge those with a merge commit, never squash the long-lived branches. Do not push development directly to `main`. See the contributing guide for validation tiers and release conventions.

## Product boundary

The CLI has one product command: init. Scaffold Next.js, Expo, web shadcn/native ports, Hono/workerd, Drizzle/D1 and private R2. Consumers own authentication, email, integrations, payments and hosting. The Codex plugin explains the foundation, initializes source, starts local development and opens the browser; it has no MCP/project catalog or provider-management runtime. Preserve older Platform image pins until Platform explicitly adopts a new scaffold.
