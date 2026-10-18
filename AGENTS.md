# Developing Anhedral

This repository owns the Anhedral CLI, source generators and optional Codex plugin. Read [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md) and the relevant section of [docs/software-factory.md](docs/software-factory.md) before changing them. Generated application conventions do not describe this repository's package layout.

- For maintenance, follow [evidence and review practices](docs/software-factory.md#evidence-driven-maintenance). Inspect current Git state and preserve unrelated work. Static findings identify candidates; verify runtime entrypoints, published exports, generated consumers and operational safeguards before deletion.
- Edit canonical documents in `docs/`; `pnpm build` refreshes bundled plugin references. Edit generated application guidance in `src/scaffold/documentation.ts`. Change the shipped skill in `plugins/codex/distribution/skills/anhedral/SKILL.md`; a local build does not update an installed plugin.
- Use `pnpm build` before tests that import `dist/`. Run focused `node --test tests/<affected>.test.mjs` checks during development, plus `pnpm typecheck` and relevant format/hygiene checks. Use the factory's full checks for release; document unavailable checks instead of weakening them.
- Keep one behavior or cleanup rationale per reviewable change. Report evidence, affected contracts and validation limits. Record dated results in `docs/verification.md`; keep enduring instructions here short and specific to demonstrated needs.
