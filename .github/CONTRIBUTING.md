# Contributing

Anhedral is maintainer-led. Small bug fixes, tests, and documentation corrections are welcome. Open an issue and obtain maintainer agreement before implementing new capabilities, architectural changes, or broad refactors. Unsolicited large changes may be closed.

Use the issue forms, search existing reports, and include the CLI version and a minimal reproduction. Keep credentials, customer data, and private deployment details out of issues, pull requests, screenshots, and logs. Report vulnerabilities through [private security reporting](https://github.com/anhedral/anhedral-cli/security/advisories/new).

External contributors should fork the repository, branch from `staging`, and target `staging`. Maintainers develop on local `staging` unless isolation is necessary. Run `pnpm install --frozen-lockfile`, `pnpm build`, focused `node --test tests/<affected>.test.mjs` checks and `pnpm lint`; describe the behavior and results. Include meaningful regression tests for code fixes. Keep unrelated formatting out of the diff. Full release checks belong at promotion, not every local edit.

Anhedral (`@anhedral`) is the primary maintainer account.
Anhedral, Ryan (`@rswearin`) and Paul (`@PaulManes`) may review and merge changes.
Review is shared among these maintainers; no rule requires Ryan's personal approval.
Required CI and CodeQL checks must pass; dependency updates are reviewed rather than automatically merged. Releases use verified artifacts and npm trusted publishing. Release credentials are never available to contribution workflows.

Contributions are licensed under this repository's Apache-2.0 license. Contributors must have the right to submit their work. Participate respectfully. Harassment, threats and disclosure of private information are unacceptable; report conduct concerns to support@anhedral.com. Maintenance is provided as capacity permits; an issue or pull request does not guarantee acceptance or a response deadline.

Documentation is part of each behavior change. Update the existing owning guide and remove obsolete claims; avoid overlapping guides. Keep exact versions, limits and defaults in source/configuration. Store dated development notes, audits and verification under `docs/agent-notes/`, with revision, checks, failures and remaining gaps. Keep raw generated reports in ignored `.artifacts/`. Run `pnpm build` to refresh bundled plugin references; never edit those copies independently. Shipped reference filenames remain compatibility entry points, not places for duplicate manuals.

For cleanup, flaky-test fixes and agent instruction changes, follow [evidence-driven maintenance](../docs/software-factory.md#evidence-driven-maintenance). Keep each change focused and include evidence for the claimed removal or root cause, affected public/generated consumers, and validation limits. Static analysis and passing tests alone do not prove that an operational path is unused.

## Branches and change size

- `main` is the stable release source. Keep it as the default branch.
- `staging` is the default maintainer development and validation branch. Make small coherent local commits there, run affected checks, and require staging CI to pass before release. Staging never automatically deploys production, provisions services, runs live provider tests or publishes packages.
- Keep one primary development checkout. Routine maintainer work stays on local `staging`; do not create a branch/worktree per task. GitHub currently requires a PR to update remote staging: publish a tested checkpoint through one temporary PR branch, then delete it after merging. This publication branch does not need its own checkout. Use a temporary `codex/<topic>` branch only for changes needing isolation or external contributions. Target `staging`, squash after review, and promptly remove the merged branch and checkout once unrelated/ignored material is preserved.
- Aim for a diff that can be understood in one review. Separate unrelated features, dependency upgrades, formatting, and refactors. About 400 non-generated lines is a review prompt, not a hard limit; explain a larger indivisible change. For isolated work, open a draft PR early. For routine staging work, push coherent checkpoints instead of every edit.
- Promote `staging` to `main` with a release PR once the intended changes are stable and their local and staging CI checks pass. Review its entire diff, list included behavior, validation and remaining gaps, then use a **merge commit**. Never squash or rebase the two long-lived branches.
- Stabilize and test `staging` before promoting it. Do not promote a branch with incomplete work or unresolved failures. Isolate a change only when it cannot safely share staging; keep that exception short-lived. Preserve existing active native/integrations work until its own review is complete, rather than folding it into cleanup.
- Fix urgent issues through staging and a small immediate release PR. Revert regressions through the same path. Do not rewrite published history, move release tags, or force-reset staging.

A staging branch is free Git history, not a second hosted environment. Use local isolated fixtures by default. Request a temporary provider preview only when it proves something local checks cannot; remove it after verification.

## Validation and cost controls

| Stage                                   | Checks                                                                                                                                                                                                 |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Local development                       | Build required inputs and run tests for the changed behavior; run format/type checks before review.                                                                                                    |
| Documentation PR                        | Git whitespace validation; no dependency install, builds, browser matrix, or release artifacts. Executable instructions, configuration and generated contracts do not count as ordinary documentation. |
| Staging push / isolated PR into staging | One short Linux gate: formatting, static checks and fast contract smoke tests.                                                                                                                         |
| Staging → main                          | The same lightweight gate; no automatic full-suite or build matrix.                                                                                                                                    |
| Publication/deployment                  | Stable main source only; provider credentials never enter contribution checks.                                                                                                                         |

Require the stable **CI gate** status, rather than every matrix name. The gate always runs and fails if scope detection or an applicable check fails. Do not path-filter the whole required workflow: documentation-only PRs must also report a result. Keep fast static security checks, pinned Actions, read-only contribution permissions, timeouts and short artifact retention. A scoped Linux compiled Next/OpenNext smoke runs automatically for web generator, build dependency and runtime harness changes, with a Worker bundle budget and one-day measurement artifacts. Full suites, browser tests and platform/generated-app matrices run locally or through the optional **Full validation (manual)** workflow; they are not required hosted merge or publication gates. Avoid scheduled full matrices and topic-branch push matrices. Staging pushes run the one scoped CI gate; isolated PRs and release PRs retain their review gate.

Hosted checks validate source and isolated fixtures. They do not establish live provider, browser, native/store or production acceptance unless those were exercised separately. Builds/tests must never migrate a configured database.

## CLI release checks

Both staging and main PRs run one Linux Node 24 **CI gate**: compile the CLI, check formatting/source hygiene/static security/release policy, and run a small contract smoke suite. The scoped Next/OpenNext runtime smoke is the exception for relevant web/build changes. There is no automatic plugin install/browser build, advisory-network scan, full unit suite or OS/Node matrix. No push workflow repeats the PR checks after merge. Documentation PRs use whitespace validation only.

Run focused tests locally while developing. Before publishing, run `pnpm release:check` locally plus plugin/generated-profile checks relevant to the changed behavior, and record that evidence in the release PR. The optional **Full validation (manual)** workflow retains the broader hosted tests for investigations; it never blocks routine merging or publishing merely because it has not been run.

To publish, explicitly run **CI** on current main to prepare the immutable candidate. That manual run adds plugin compilation and packaging/integrity/smoke checks; it does not run the full validation matrix. Review the CLI/plugin integrities, then dispatch **Release Reviewed Candidate**. Publishing verifies the exact artifact using Linux/Node 24, retains the npm environment approval, OIDC/provenance and immutable tags, and does not run a cross-platform matrix. Candidate artifacts expire after one day; rerun the manual main candidate step if needed.

Use a separate version-preparation PR into staging for each targeted release. Keep `package.json`, `src/version.ts` and marketplace plugin tag synchronized; build refreshes bundled references/manifests. Use SemVer: patch for compatible fixes, minor for additions, and explicitly document breaking 0.x changes. List included PRs and known limitations in the release PR and GitHub release notes.

Merge staging → main with a merge commit. Explicitly run CI on main to build the candidate. Review its CLI/plugin SHA-512 integrities and dispatch **Release Reviewed Candidate** against the exact current main SHA. Existing exact-artifact verification, protected npm environment, portability, trusted publishing, provenance and immutable tags remain required. Main merges never automatically publish npm. Confirm npm version/integrity and GitHub release assets after publication.

Main and staging must require `CI gate`, prevent force pushes/deletion, and require resolved conversations. Preserve main's CodeQL requirements and the shared maintainer review process; do not add a separate `rswearin review` rule. `CODEOWNERS` lists all three maintainers for review routing. Enable merge commits alongside squash; do not enable automatic deletion of long-lived staging. New contribution PRs target staging; review and retarget existing PRs individually so unrelated or obsolete work is not silently included.

The entire repository is limited to 20 tracked Markdown files. Use existing guides
and the single `docs/agent-notes/README.md` log. Retired records stay in Git history;
do not add archives or duplicate manuals. CI checks the file budget on every run.
