# Scaffold workflow

1. Preview an empty destination with `anhedral init my-app --dry-run --json`, then
   run `anhedral init my-app` and `pnpm dev` inside it.
2. Read the generated README, AGENTS, `anhedral.json`, environment examples and
   Wrangler configuration. Use their recorded tool versions.
3. Preview and add [capabilities](capabilities.md) as needed. Configure selected
   providers/auth methods, apply reviewed migrations and validate actual runtime
   behavior before deployment. Source installation is not provider activation.
4. Extend [source-owned UI](ui.md), implement features and run consumer checks.

## Evidence-driven maintenance

Inspect current Git state and preserve unrelated work. Verify runtime entrypoints,
exports, generated consumers and operational safeguards before removing source;
static findings and passing tests alone do not prove a path is unused.

Update the existing owning guide with behavior changes. Keep exact versions and
defaults in manifests/source, not duplicated narratives. Store dated development,
audit and verification notes in
[docs/agent-notes](https://github.com/anhedral/anhedral-cli/tree/main/docs/agent-notes),
with revision, checks, failures and remaining gaps. Keep raw reports in ignored
`.artifacts/`. Historical notes are not current instructions.

Canonical docs live in `docs/`; `pnpm build` refreshes bundled plugin references.
Generated app guidance lives in `src/scaffold/documentation.ts`. Preserve shipped
reference paths, source-generation safety, dependency patch gates, UI provenance,
licenses and exact-artifact packaging. A build does not publish npm or update an
installed plugin. See [Contributing](https://github.com/anhedral/anhedral-cli/blob/main/.github/CONTRIBUTING.md)
for staging, release identity and validation tiers.

## Next/OpenNext runtime gate

Relevant generator/build changes compile an isolated foundation and exercise it
in workerd. Run `pnpm test:next-runtime` for SSR/RSC, Server Actions/cookies,
prerendering and static cache checks. Hono proxy contracts have separate tests.
The harness owns the module-size budget and short-lived `.artifacts/next-runtime/`
receipts. Review measurement changes before adjusting limits. The smoke never
deploys or migrates a configured database; it is not production acceptance.
