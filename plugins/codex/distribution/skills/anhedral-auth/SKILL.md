---
name: anhedral-auth
description: "Configure Anhedral provider access and application authentication with Better Auth or Clerk; verify sessions, callback origins and resource authorization."
---

# Anhedral Auth

Distinguish provider login, hosting protection and application identity.

- Inspect the app's auth packages, environment examples and selected CLI help.
  `anhedral auth --status --json` checks provider access. Use interactive login
  when needed; JSON/noninteractive checks do not open login prompts.
- For application identity, Hono owns the server in new apps. Complete its
  Better Auth/Clerk routes,
  compatible database setup, callback origins and session handling. Preserve auth
  secrets and intended access rules. Better Auth’s web client uses the same-origin
  proxy; configure the API `BETTER_AUTH_URL` to the public web origin. Test the
  sign-in/account UI and protected `/api/session`. Expo + Better Auth generates
  the server Expo plugin with exact trusted scheme, SecureStore native client/cookie
  adapter, separate browser client and shared protected session contracts.
  Keep credentials out of client bundles and chat.
- If identity is missing, preview the compatible catalog addition with
  `anhedral add better-auth --cwd my-app --dry-run --json` before applying it.
  Review migrations against the intended development database explicitly.
- Verify sign-in/out, expired/revoked sessions, denied users and cross-user resource
  access. Preserve CSRF and callback checks. Hosting protection does not implement
  application roles; provider login does not establish visitor authentication.

Report the specific missing access or failing flow when integration is blocked.

For Expo, browser sessions use the same-origin gateway; native clients forward
session credentials to the public Hono origin. Match the SecureStore adapter,
trusted scheme and callback origins to the generated client/server configuration.
See [cross-platform runtime](../anhedral-dev/references/cross-platform.md) for
transport and device verification. Verify sign-in, session refresh and sign-out on
a real development build/device before claiming native acceptance.

Accounts are optional. Selecting Better Auth adds Hono and a compatible database.
Preserve existing provider selections;
explicit Clerk overrides Better Auth, and its native integration requires
implementation. Use [Billing](../anhedral-billing/SKILL.md) when connecting the
verified application identity to provider customers or native purchase accounts.
