# Anhedral Stack

**Anhedral Stack** is the single current stack. The CLI generates its editable source; Platform independently owns managed builds, resource admission, deployment and operations. There is no public multi-stack registry or framework selector.

The web foundation uses TanStack Start SSR/server functions and source-owned shadcn Anhedral UI. `anhedral init` creates only that foundation. `add backend` composes Hono, Drizzle/D1 and Better Auth together. Add private R2 or Stripe subscriptions later when needed. See [additions](capabilities.md).

When selected, Hono owns privileged business/auth/data/storage operations. Web server functions call its scoped service binding; application source is never imported across application boundaries. Keep resources private, enforce identity/ownership/limits and configure secrets per environment.

Auth methods and payment providers require explicit activation. Apply reviewed migrations separately from builds/startup. Source-owned UI preserves semantic tokens, consumer edits and upstream licensing; see [UI ownership](ui.md).

Recorded source provenance is not a hosting receipt. Runtime profile `anhedral-stack` identifies the current deployment contract; exact artifact/runtime policy, current authority and production approval still apply. Legacy generators, framework aliases and compatibility stack selection are removed. OJ is pinned by the generated runtime manifest.
