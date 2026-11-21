# Anhedral Stack application

Use the single Anhedral Stack, starting with TanStack Start and source-owned shadcn UI. Add backend for Hono,
Drizzle/D1 and Better Auth together. Add storage and payments only when required. Mobile,
extensions and desktop are outside launch scope.

Edit web product routes in apps/web/src/routes, API routes in apps/api/src/index.ts,
and database schema in packages/db/src. Preserve customized composition adapters,
semantic UI tokens and attribution. No cross-application source imports.
Web server functions receive scoped API bindings through request context; keep
identity, database/storage access and secrets inside Hono. Auth methods require
explicit activation. Run pnpm check and pnpm audit:deps. Never migrate a configured
database in builds/tests/startup; apply reviewed SQL deliberately to isolated fixtures.
