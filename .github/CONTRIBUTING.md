# Contributing

Anhedral is maintainer-led. Small bug fixes, tests, and documentation corrections are welcome. Open an issue and obtain maintainer agreement before implementing new capabilities, architectural changes, or broad refactors. Unsolicited large changes may be closed.

Use the issue forms, search existing reports, and include the CLI version and a minimal reproduction. Keep credentials, customer data, and private deployment details out of issues, pull requests, screenshots, and logs. Report vulnerabilities through [private security reporting](https://github.com/anhedral/anhedral-cli/security/advisories/new).

For a pull request, fork the repository, create a focused branch, run `pnpm install --frozen-lockfile` and `pnpm test:all`, and describe the behavior change and validation. Run `pnpm format` after source changes; `pnpm lint` enforces the shared format and type checks. Include meaningful regression tests for code fixes. Avoid generated artifacts and unrelated formatting changes.

`rswearin` owns review and merge decisions. Required CI and CodeQL checks must pass; dependency updates are reviewed rather than automatically merged. Releases use verified artifacts and npm trusted publishing. Release credentials are never available to contribution workflows.

Contributions are licensed under this repository's Apache-2.0 license. Contributors must have the right to submit their work. Participate respectfully and follow the [code of conduct](CODE_OF_CONDUCT.md). Maintenance is provided as capacity permits; an issue or pull request does not guarantee acceptance or a response deadline.

Documentation is a maintained part of each change. Update the owning stack standard, software factory, provider, CLI or plugin guide when its behavior changes, and remove obsolete material. Prefer an existing section over a new document. Keep verification results and remaining acceptance gaps in the maintained verification record; retain detailed dated output with release/test artifacts rather than adding duplicate analysis reports. Run `pnpm build` to refresh bundled plugin references after documentation changes; do not maintain those copies independently.

For cleanup, flaky-test fixes and agent instruction changes, follow [evidence-driven maintenance](../docs/software-factory.md#evidence-driven-maintenance). Keep each change focused and include evidence for the claimed removal or root cause, affected public/generated consumers, and validation limits. Static analysis and passing tests alone do not prove that an operational path is unused.
