# Stack standard

The executable `anhedral init` creates only TanStack Start SSR/server functions
and source-owned Anhedral UI. `add backend` composes Hono, Drizzle/D1 and Better Auth
together. Add private R2 or Stripe subscriptions later when required;
`--with-dependencies` includes missing backend prerequisites. The legacy programmatic
generator and existing Next.js/OpenNext projects retain their progressive recipes; mobile and other
clients remain open-source options outside launch support. See [capabilities](capabilities.md).

When selected, Hono owns privileged data and application authorization. TanStack
server functions (or Next server actions in legacy applications) call the API. Share framework-independent contracts and tokens
without cross-importing application source. Keep R2 private and enforce identity,
ownership and limits before exposing files. Apply reviewed database migrations
explicitly, separately from builds and startup.

UI source belongs to the consumer: official shadcn for web, React Native Reusables
for Expo and a small reviewed native extension layer. Preserve licenses, semantic
tokens and local edits. See [UI commands](ui.md).

The CLI writes editable source/configuration; consumers configure services,
credentials and deployment. Platform separately owns its managed operations.
Source composition version 2 does not establish live Platform hosting readiness;
matching source/runtime integration requires separate adoption and verification.
Existing applications, legacy native work and runtime artifacts retain their
reviewed pins until deliberately adopted and validated.
