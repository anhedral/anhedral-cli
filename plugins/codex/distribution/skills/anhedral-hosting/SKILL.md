---
name: anhedral-hosting
description: "Provision and verify the core Cloudflare Worker, D1 and private R2 application."
---

# Anhedral Hosting

Inspect source revision, CLI version/help, anhedral.json and existing resource receipts. Hosting is Cloudflare Workers through Wrangler: Expo static gateway plus Hono API, D1 and private R2. Preserve original hosting for older applications; this skill does not authorize migration or reinitialization.

Generation, provisioning, database migrations, secret installation, deployment and acceptance are separate steps. Preview supported plans first. Use authorized existing accounts and explicit environment selection. Never publish credentials or weaken account/audience/source checks to unblock delivery.

Commit source and resolved non-secret configuration before shipping. Verify the actual provider/source identity and deployed flow. Resource existence or HTTP 200 is not application acceptance; check authentication, cross-user isolation, private files and selected payment flows. Rollback cannot undo data or SQL migrations. Native signing/EAS/device/store release remains separate from Worker delivery.

Stripe and RevenueCat are the only optional application providers. Do not provision media, alternative databases, hosting engines or other catalog services. Do not activate payment live mode without explicit authorization.
