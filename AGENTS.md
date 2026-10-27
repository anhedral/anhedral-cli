# Developing Anhedral

This repository owns the Anhedral CLI, source generators and skills-only Codex plugin. Read [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) and the relevant section of [docs/software-factory.md](docs/software-factory.md) before changing them. Generated application conventions do not describe this repository's package layout.

- For maintenance, follow [evidence and review practices](docs/software-factory.md#evidence-driven-maintenance). Inspect current Git state and preserve unrelated work. Static findings identify candidates; verify runtime entrypoints, published exports, generated consumers and operational safeguards before deletion.
- Edit canonical documents in `docs/`; `pnpm build` refreshes bundled plugin references. Edit generated application guidance in `src/scaffold/documentation.ts`. Change the shipped skills in `plugins/codex/distribution/skills/anhedral-*/SKILL.md`; a local build does not update an installed plugin.
- Use `pnpm build` before tests that import `dist/`. Run focused `node --test tests/<affected>.test.mjs` checks during development, plus `pnpm typecheck` and relevant format/hygiene checks. Use the factory's full checks for release; document unavailable checks instead of weakening them.
- Keep one behavior or cleanup rationale per reviewable change. Report evidence, affected contracts and validation limits. Record dated results in `docs/agent-notes/`; keep enduring instructions here short and specific to demonstrated needs. Update the existing owning guide with behavior changes; link to source/configuration for exact defaults and avoid overlapping guides.

- Work on local `staging` for routine maintainer development and test that branch. Keep one primary development checkout; use a temporary `codex/<topic>` branch/worktree only when isolation is necessary or for an external contribution, then remove it after merging. The superseded native port is archived outside the active checkout; see docs/native-ui.md. `main` accepts stable release PRs from tested `staging`, merged with a merge commit; never squash the long-lived branches or push development directly to `main`. Where GitHub protects staging with a PR gate, publish one coherent staging checkpoint through a temporary PR branch and delete it after merging; do not bypass the gate or create a worktree per checkpoint. See the contributing guide for validation and release conventions.

The public surface is minimal Next.js/Anhedral UI init, progressive add, stack list/status/doctor and ui init/add/list/diff/doctor. See [UI ownership](docs/ui.md). Do not restore legacy port code or whole-catalog parity gates into the active CLI. Recover selected work from the archive only through reviewed native extensions. Do not substitute unreleased source into Platform’s reviewed artifacts.

Capability composition and generated assets follow [the addition contract](docs/capabilities.md). Never report source installation as provider activation. Preserve journaled writes, the dependency patch gate, disabled-by-default auth methods and explicit source-only dry runs.

## Documentation budget

Keep at most 20 tracked Markdown files in the entire repository, including skills
and agent notes. Update an existing guide with behavior changes. Keep dated notes
in `docs/agent-notes/README.md`; older records remain in Git history. Do not create
parallel manuals or rename ordinary guides to evade the budget. Source-consumed
text assets and third-party license/provenance notices retain their owning paths.
