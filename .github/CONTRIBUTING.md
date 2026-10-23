# Contributing

Anhedral is maintainer-led. Small bug fixes, tests, and documentation corrections are welcome. Open an issue and obtain maintainer agreement before implementing new capabilities, architectural changes, or broad refactors. Unsolicited large changes may be closed.

Use the issue forms, search existing reports, and include the CLI version and a minimal reproduction. Keep credentials, customer data, and private deployment details out of issues, pull requests, screenshots, and logs. Report vulnerabilities through [private security reporting](https://github.com/anhedral/anhedral-cli/security/advisories/new).

For a pull request, fork the repository, branch from `staging`, and target `staging`. Run `pnpm install --frozen-lockfile`, `pnpm build`, focused `node --test tests/<affected>.test.mjs` checks and `pnpm lint`; describe the behavior and results. Include meaningful regression tests for code fixes. Keep unrelated formatting out of the diff. Full release checks belong at promotion, not every local edit.

Anhedral (`@anhedral`) is the primary maintainer account.
Anhedral, Ryan (`@rswearin`) and Paul (`@PaulManes`) may review and merge changes.
Review is shared among these maintainers; no rule requires Ryan's personal approval.
Required CI and CodeQL checks must pass; dependency updates are reviewed rather than automatically merged. Releases use verified artifacts and npm trusted publishing. Release credentials are never available to contribution workflows.

Contributions are licensed under this repository's Apache-2.0 license. Contributors must have the right to submit their work. Participate respectfully and follow the [code of conduct](CODE_OF_CONDUCT.md). Maintenance is provided as capacity permits; an issue or pull request does not guarantee acceptance or a response deadline.

Documentation is a maintained part of each change. Update the owning stack standard, software factory, provider, CLI or plugin guide when its behavior changes, and remove obsolete material. Prefer an existing section over a new document. Keep verification results and remaining acceptance gaps in the maintained verification record; retain detailed dated output with release/test artifacts rather than adding duplicate analysis reports. Run `pnpm build` to refresh bundled plugin references after documentation changes; do not maintain those copies independently.

For cleanup, flaky-test fixes and agent instruction changes, follow [evidence-driven maintenance](../docs/software-factory.md#evidence-driven-maintenance). Keep each change focused and include evidence for the claimed removal or root cause, affected public/generated consumers, and validation limits. Static analysis and passing tests alone do not prove that an operational path is unused.

## Branches and change size

- `main` is the stable release source. Keep it as the default branch.
- `staging` is integration source. It does not automatically deploy, provision services, run live provider tests, or publish packages.
- Start a short-lived `codex/<topic>` branch from current `origin/staging` (contributors may use a fork). Open a PR into `staging` for one bug, feature, or maintenance purpose; squash it after checks and maintainer review.
- Aim for a diff that can be understood in one review. Separate unrelated features, dependency upgrades, formatting, and refactors. About 400 non-generated lines is a review prompt, not a hard limit; explain a larger indivisible change. Open draft PRs early, but push checkpoints instead of every edit.
- Promote `staging` to `main` with a release PR after one small coherent change or a few related changes. Do not wait for a weekly batch. Review its entire diff, list included behavior, validation and remaining gaps, then use a **merge commit**. Never squash or rebase the two long-lived branches.
- Keep staging releasable. Hold unfinished work on topic branches. If unrelated work has already landed, revert it through a staging PR before promotion; do not turn release preparation into routine cherry-picking.
- Fix urgent issues through staging and a small immediate release PR. Revert regressions through the same path. Do not rewrite published history, move release tags, or force-reset staging.

A staging branch is free Git history, not a second hosted environment. Use local isolated fixtures by default. Request a temporary provider preview only when it proves something local checks cannot; remove it after verification.

## Validation and cost controls

| Stage | Checks |
| --- | --- |
| Local development | Build required inputs and run tests for the changed behavior; run format/type checks before review. |
| Documentation PR | Git whitespace validation; no dependency install, builds, browser matrix, or release artifacts. Executable instructions, configuration and generated contracts do not count as ordinary documentation. |
| PR into staging | One short Linux gate: formatting, static checks and fast contract smoke tests. |
| Staging → main | The same lightweight gate; no automatic full-suite or build matrix. |
| Publication/deployment | Stable main source only; provider credentials never enter contribution checks. |

Require the stable **CI gate** status, rather than every matrix name. The gate always runs and fails if scope detection or an applicable check fails. Do not path-filter the whole required workflow: documentation-only PRs must also report a result. Keep fast static security checks, pinned Actions, read-only contribution permissions, timeouts and short artifact retention. Full suites, browser tests and platform/generated-app matrices run locally or through the optional **Full validation (manual)** workflow; they are not required hosted merge or publication gates. Avoid scheduled full matrices and duplicate push checks on topic/staging branches.

Hosted checks validate source and isolated fixtures. They do not establish live provider, browser, native/store or production acceptance unless those were exercised separately. Builds/tests must never migrate a configured database.

## CLI release checks

Both staging and main PRs run one Linux Node 24 **CI gate**: compile the CLI, check formatting/source hygiene/static security/release policy, and run a small contract smoke suite. There is no automatic plugin install/browser build, advisory-network scan, full unit suite, generated app build or OS/Node matrix. No push workflow repeats the PR checks after merge. Documentation PRs use whitespace validation only.

Run focused tests locally while developing. Before publishing, run `pnpm release:check` locally plus plugin/generated-profile checks relevant to the changed behavior, and record that evidence in the release PR. The optional **Full validation (manual)** workflow retains the broader hosted tests for investigations; it never blocks routine merging or publishing merely because it has not been run.

To publish, explicitly run **CI** on current main to prepare the immutable candidate. That manual run adds plugin compilation and packaging/integrity/smoke checks; it does not run the full validation matrix. Review the CLI/plugin integrities, then dispatch **Release Reviewed Candidate**. Publishing verifies the exact artifact using Linux/Node 24, retains the npm environment approval, OIDC/provenance and immutable tags, and does not run a cross-platform matrix. Candidate artifacts expire after one day; rerun the manual main candidate step if needed.

Use a separate version-preparation PR into staging for each targeted release. Keep `package.json`, `src/version.ts` and marketplace plugin tag synchronized; build refreshes bundled references/manifests. Use SemVer: patch for compatible fixes, minor for additions, and explicitly document breaking 0.x changes. List included PRs and known limitations in the release PR and GitHub release notes.

Merge staging → main with a merge commit. Explicitly run CI on main to build the candidate. Review its CLI/plugin SHA-512 integrities and dispatch **Release Reviewed Candidate** against the exact current main SHA. Existing exact-artifact verification, protected npm environment, portability, trusted publishing, provenance and immutable tags remain required. Main merges never automatically publish npm. Confirm npm version/integrity and GitHub release assets after publication.

Main and staging must require `CI gate`, prevent force pushes/deletion, and require resolved conversations. Preserve main's CodeQL requirements and the shared maintainer review process; do not add a separate `rswearin review` rule. `CODEOWNERS` lists all three maintainers for review routing. Enable merge commits alongside squash; do not enable automatic deletion of long-lived staging. New contribution PRs target staging; review and retarget existing PRs individually so unrelated or obsolete work is not silently included.
