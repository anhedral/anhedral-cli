---
name: anhedral-init
description: "Scaffold an editable Next.js, Expo, shadcn, Hono/workerd, Drizzle/D1 and private R2 foundation, start it locally and open the browser."
---

# Anhedral Init

Explain the foundation and establish the destination. Inspect it first. Preserve existing apps and never initialize over user source. The generated app is the consumer's source; Anhedral CLI does not manage authentication, email, payments, hosting or provider accounts.

Use the selected/pinned CLI version. If unavailable, install the reviewed CLI release using the user's package manager; do not silently run a different generator. Run `anhedral init <directory> --dry-run --json`, then apply the same options. `--skip-install --no-git` writes source offline. The only product command is init; do not invoke retired inspect, add, auth, ship or provider-management commands.

Read the emitted README.md and AGENTS.md, install dependencies if skipped, and start pnpm dev. Reuse an existing appropriate local server. Use its actual printed URL, verify the health flow, then open that local URL in the available browser tool. Start Expo separately when native work is requested and set its device-reachable API origin. Do not call a server started or a page working without observing it.

Read ../../references/stack-standard.md for ownership and ../anhedral-design/SKILL.md for web/native UI conventions. Implement the requested product using the generated source and consumer-chosen services.

## Optional consumer tools

When a user requests hosting, discover the separate Cloudflare plugin in the Codex plugin manager and explain how to install it. For web payments, recommend the separate Stripe plugin; for native subscriptions, discover a RevenueCat plugin if available, otherwise use RevenueCat's official documentation and SDKs. Do not invent plugin availability or claim these are included. Install only when the user requests installation. These providers' tools and credentials are separate from Anhedral; follow their workflows and the user's authorization.

The open-source foundation requires no Anhedral Platform account. Platform is a separate B2B managed service. Provider setup, purchases, native signing/store distribution and production verification are the consumer's responsibility.
