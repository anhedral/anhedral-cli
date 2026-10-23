---
name: anhedral-init
description: "Create the maintained Expo, Hono, Drizzle/D1 and private R2 application with optional Stripe and RevenueCat."
---

# Anhedral Init

Turn the product brief into users, data boundaries and observable acceptance criteria. Inspect the destination first; continue an existing app rather than overwriting it.

The default is Expo web/iOS/Android, Hono on Cloudflare Workers, Drizzle/D1 and private R2, with supporting Better Auth and shared styling. There are no frontend/database/provider presets. Stripe and RevenueCat are the only additions; they are independently optional.

Pin the project CLI version. Preview and apply identical options:

```sh
anhedral init my-app --dry-run --json
anhedral init my-app
anhedral init paid-app --stripe --revenuecat --dry-run --json
```

Use `--skip-install --no-git` for offline source-only generation. Generation does not provision resources, apply remote migrations, activate providers or deploy. Review emitted README, AGENTS, environment templates, anhedral.json and migrations. Implement actual product flows and verify isolation. Continue with Dev, Auth, Billing and Hosting as appropriate. Preserve existing apps on their original CLI until an explicit reviewed migration; never reinitialize them to conform.
