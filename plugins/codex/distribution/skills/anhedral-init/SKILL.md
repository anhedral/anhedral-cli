---
name: anhedral-init
description: "Create a minimal Next.js and Anhedral UI app, start it locally and verify it."
---

# Anhedral Init

Inspect and preserve the destination. Use the explicitly selected reviewed CLI version. Preview `anhedral init <directory> --dry-run --json`, then apply the same options. `--skip-install --no-git` generates offline. New init creates only Next.js/OpenNext for Workers with Anhedral UI, shared tokens and tooling. It does not create Expo, Hono, a database, authentication or provider resources.

Read emitted README.md and AGENTS.md, install if skipped, start pnpm dev and observe its actual URL before opening it in the browser. Reuse an appropriate existing server. Do not call a page working without checking it. See ../../references/stack-standard.md and ../anhedral-design/SKILL.md.

Use the new `anhedral ui` family for source-owned UI. Do not invoke retired top-level add, auth, inspect, ship or provider-management commands. Existing Platform artifacts retain their reviewed generator pins; do not substitute an unreleased checkout into managed runtime images.

Add Hono, Drizzle/D1/Better Auth, private R2, Expo, WXT/Side Panel, GPUI, Stripe, RevenueCat, realtime or AI strategically when a feature needs them. The exact “if needed” conditions remain open. These are architectural choices, not currently implemented CLI addition commands. UI installation itself has no backend prerequisite.

The CLI requires no Platform account. Hosting and provider operations belong to consumers or the separate managed Platform. Discover separate provider plugins when requested; do not invent availability or install them without a request. Follow their own authorization and verification workflows.
