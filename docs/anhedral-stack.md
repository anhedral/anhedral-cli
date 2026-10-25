# Application foundation

Next.js web and Expo native call Hono. Hono owns Drizzle/D1 persistence and private R2 access. Web uses DOM shadcn; native uses Anhedral’s maintained shadcn ports. Contracts and design tokens are shared.

Cloudflare Workers use workerd. OpenNext supplies the Next.js Worker adapter. Generated Wrangler configuration supports local development and consumer-managed deployment. It is not a hosted management service.

Consumers implement application features, identity, authorization, integrations and hosting. No Platform identity, payment service or email broker is built into the foundation. See stack-standard.md for boundaries.
