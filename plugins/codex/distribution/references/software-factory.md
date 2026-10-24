# Software factory

Anhedral CLI supplies the starter foundation for applications built with Anhedral. Developers and Anhedral Agents extend its editable source; Anhedral Platform brings collaboration and delivery oversight together, and Anhedral Cloud hosts applications and their managed services. The workflow below describes the technical steps supporting that foundation.

Use one maintained architecture: Next.js web + Expo native + Hono + Drizzle/D1 + private R2, supporting Better Auth and shared styling. Stripe and RevenueCat are the only optional additions. The [stack standard](stack-standard.md) owns architectural boundaries.

## Generate

Use the pinned CLI version, supported Node runtime and generated pnpm version. Preview with `anhedral init my-app --dry-run --json`; generate with the same options. `--skip-install --no-git` writes source without network or a repository. Normal initialization may install dependencies and initialize Git, but never provisions cloud resources, migrates a remote database or deploys.

```sh
anhedral init my-app
anhedral init paid-app --stripe --revenuecat
```

Review generated README, AGENTS, anhedral.json, environment templates, migration files and scripts. Secrets belong only in ignored private runtime files. Preserve useful existing applications rather than reinitializing them.

## Develop and validate

Run generated `pnpm dev` for Next.js web and Hono. Start Expo Metro separately for iOS/Android with the generated mobile command. Web uses the full App Router, including SSR and React Server Components; production builds run through Cloudflare OpenNext rather than static export. The OpenNext Worker forwards API requests through `ANHEDRAL_API`; native clients use the configured HTTPS origin. Keep web DOM shadcn components separate from the Anhedral native shadcn port, sharing contracts and design tokens.

Build complete vertical slices with persistent data, validation, owner authorization, error/loading states and meaningful tests. Verify session isolation and denied private-file access. Apply migrations explicitly to isolated local fixtures. Builds and tests must never migrate a configured remote database.

Run `pnpm check`, `anhedral doctor --json` and `anhedral inspect --json`. Local inspection reports declared configuration and recorded evidence, not live provider health. Compile/export success is not device or production acceptance. Generated typecheck tasks cache Worker binding declarations, Next environment declarations and route types; generated next-env.d.ts stays ignored. The integration runner deletes those files and verifies real cache hits restore their exact bytes. For an installed isolated fixture, run `node tests/test-generated-typecheck-cache.mjs /absolute/path/to/fixture` from the CLI repository. Existing applications must explicitly adopt the typecheck outputs and ignore change; upgrading the CLI does not rewrite their configuration.

## Add payments

```sh
anhedral add stripe --cwd my-app --dry-run --json
anhedral add stripe --cwd my-app
anhedral add revenuecat --cwd my-app
```

Only these two additions are supported. Use the exact project generator version and preserve edited-source fingerprints; review conflicts instead of forcing replacement. Configure provider scope, plans, environment and credentials before acceptance. Test retries, duplicate/reordered webhooks, account switching, refunds/revocation and expiry. Native purchases require an actual device build and store sandbox configuration.

## Provision and deliver

Use the CLI help for exact flags. Authenticate the selected Cloudflare/provider accounts explicitly, inspect plans, and provision only authorized resources. Commit resolved tracked configuration before delivery. Keep management credentials out of application code and logs. Secret installation, provider activation, DNS ownership and any spending approvals remain explicit operator steps.

Cloudflare delivery checks clean-source provenance, account identity, selected audience and recorded releases. Retain those safeguards. A deployment exit code alone does not prove the intended application works. Migrations are explicit; no automatic remote database migration during checks/startup. Native builds and store distribution are separate workflows.

Verify the actual deployed web URL and target device against product acceptance criteria, including anonymous rejection and cross-account isolation. Record source SHA, exact artifact identity, commands, outcomes and remaining limitations. Rollback does not restore data or undo migrations; review data compatibility independently.

## Evidence-driven maintenance

Before deleting code, trace runtime entrypoints, published exports, generated consumers, plugin tools and maintained examples. Keep changes scoped to an explicit behavior. The 0.14 scope reduction deliberately removes unsupported alternatives; it does not authorize deleting customer source, remote resources, credentials or historical verification.

Preserve operational checks, secret protection, lock/recovery safeguards and independent provider evidence. For generator changes, check emitted source and packed package behavior. For provider changes, distinguish isolated contract fixtures from live acceptance. Passing static tests cannot establish production operation.

## Maintain and release the CLI

Follow repository AGENTS and CONTRIBUTING instructions. Use short-lived codex branches from staging and reviewable PRs into staging. Main accepts release promotions; no direct development pushes. Preserve reviewed release artifacts, npm provenance, plugin source integrity and protected publishing. Saving code to GitHub is separate from publishing npm, deploying customer applications, or installing a plugin.

Run build, typecheck, formatting/source hygiene, static security, relevant unit/generated runtime tests and packed-consumer tests. The Codex plugin has its own build/check and independently packaged runtime. A local CLI build does not update an installed plugin. Keep package version, source generator version and plugin marketplace reference synchronized.
