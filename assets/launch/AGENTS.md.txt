# Application conventions

- Edit product pages in `apps/web/src/routes` and shared UI in `apps/web/src/components/ui`. Keep the ShadCN license with its components.
- With the backend installed, put custom API routes in `apps/api/src/index.ts` and database schema in `packages/db/src`. Web server functions call the API through its service binding. Keep identity, secrets, and database and storage access in the API.
- Review auth configuration before enabling a sign-in method. Generate and review SQL before applying it to an explicitly selected database. Builds, tests, and startup must leave configured databases untouched.
- Preview changes to CLI-managed adapters with `pnpm dlx anhedral@latest stack update --dry-run --human`. Preserve existing application edits.
- Run `pnpm check` and `pnpm audit:deps` before shipping.
