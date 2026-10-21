## Change

Target `staging` for one change; use `staging` → `main` for a focused release.

Describe the problem and resulting behavior. Link the agreed issue for feature or architecture changes.

For maintenance, include the removal evidence or failure cause and affected public/generated consumers. Link authoritative configuration or CI evidence when relevant; identify anything unverified.

## Validation

List relevant checks and regression coverage, including generated-app checks when applicable.

- [ ] The change is focused and I have the right to contribute it under Apache-2.0.
- [ ] Tests pass and public behavior or documentation is updated where needed.
- [ ] No credentials, customer data, or private deployment details are included.

## Release impact

For promotions, list included PRs, version, remaining acceptance gaps and release notes.
Merge staging → main with a merge commit. Publication requires a separate reviewed-artifact dispatch.
