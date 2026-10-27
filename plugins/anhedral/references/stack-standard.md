# Stack standard

Start with Next.js App Router, OpenNext for Cloudflare Workers and source-owned
Anhedral UI. Add Hono, then Drizzle/D1 and Better Auth. Add private R2, payments,
realtime, AI and other clients as required. The [README](https://github.com/anhedral/anhedral-cli#readme) lists every
addition; [capabilities](capabilities.md) owns prerequisites and safety.

Hono owns privileged data and application authorization. Next server actions
adapt forms and call the API. Share framework-independent contracts and tokens
without cross-importing application source. Keep R2 private and enforce identity,
ownership and limits before exposing files. Apply reviewed database migrations
explicitly, separately from builds and startup.

UI source belongs to the consumer: official shadcn for web, React Native Reusables
for Expo and a small reviewed native extension layer. Preserve licenses, semantic
tokens and local edits. See [UI commands](ui.md).

The CLI writes editable source/configuration; consumers configure services,
credentials and deployment. Platform separately owns its managed operations.
Existing applications, legacy native work and runtime artifacts retain their
reviewed pins until deliberately adopted and validated.
