# example-app

Anhedral Stack: web UI powered by OJ and TanStack Start server rendering/server functions
and editable shadcn components.
Only the web application is created initially. No backend or provider is provisioned.

## Develop

Use the Node/pnpm versions in package.json. Run pnpm install if generation skipped
installation, then pnpm dev and open http://localhost:3000. Run pnpm check and
pnpm audit:deps before deployment. Editable routes live in apps/web/src/routes.
Use cd apps/web && pnpm dlx shadcn@4.22.1 add card for more shadcn components.
Shadcn is the default, not a restriction: use any UI library and preserve local edits.
Keep LICENSE.shadcn with the copied starter components.

## Add services progressively

Run anhedral add backend to add Hono, Drizzle/D1 and Better Auth together.
Then run anhedral add storage for private storage, or anhedral add payments for payments.
Missing prerequisites stop before writes; --with-dependencies opts into them.
The public additions are backend, storage and payments; this application is web-only.

After adding backend, copy apps/api/.dev.vars.example to apps/api/.dev.vars.
Set PUBLIC_APP_URL=http://localhost:3000 and generate BETTER_AUTH_SECRET with
`node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`.
Auth methods start disabled. Deliberately enable chosen methods in
apps/api/src/auth-features.ts after configuring email/credentials and policies.
Run pnpm db:migrate --local explicitly to initialize the isolated local D1 database,
then pnpm dev. OJ runs the web and auxiliary API Workers with shared local
persistence. Remote bindings are disabled for local development.

R2 routes enforce authenticated owner access. Stripe adds schema and source only:
run pnpm db:generate, review the SQL, then deliberately apply the local migration
before exercising subscription/webhook flows. Configure Stripe test credentials,
allowed prices and signed webhooks; activation and live payments are separate.

## Ownership and deployment

Hono owns data, identity and private storage. Web server functions call its scoped
service binding, never import another application's source or provider credentials.
Custom API routes belong in apps/api/src/index.ts; schema/migrations in packages/db.
Composition adapters are fingerprinted and customized files are never overwritten.

Builds/startup never migrate databases. Provision D1/R2 only when selected and
configure environment-specific resources/secrets separately. pnpm build emits web
Worker artifacts under apps/web/dist and selected API artifacts under apps/api/dist. Anhedral Platform admission
requires its separately reviewed Anhedral Stack runtime/artifact; generation is not activation.
