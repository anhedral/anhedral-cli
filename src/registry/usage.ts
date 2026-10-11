import { STANDARD_PRODUCTS } from '../stack-registry.js';

export const STANDARD_USAGE = `Anhedral Application Stack & Delivery Standard

anhedral new <directory> [products...] [--hosting cloudflare|vercel] [--skip-install] [--no-git] [--dry-run] [--json]
anhedral add <directory> <items...> [--dry-run] [--skip-install] [--json]
anhedral init [products...] [--hosting cloudflare|vercel] [--skip-install] [--git] [--dry-run] [--json]

Default: Vinext on Cloudflare Workers, from the official shadcn pnpm/Turborepo monorepo.
Web hosting: Vinext on Cloudflare by default; native Next.js on Vercel is an explicit option.
Products: ${STANDARD_PRODUCTS.join(', ')}
Examples:
  anhedral new client-app
  anhedral new mobile-app --expo
  anhedral new product --next --expo --hono --neon --clerk --r2
  anhedral new website --next --stripe --resend
  anhedral init --wxt
  anhedral cloud register|stage|save|deploy|status [directory] (managed service API required)
  anhedral registry list|view [item] [--json]
  anhedral doctor [directory] [--providers] --json
  anhedral repository [directory] [--owner <github-account>] [--name <repo>] [--visibility private|public] [--create]
  anhedral register [directory]
  anhedral connect [directory] [--scope <team>] --audience public|private --use personal|commercial [--create] [--git]
  anhedral connect [directory] --provider cloudflare [--account <id>] --audience public|private [--allow-email <email>]
  anhedral provision [directory] [--dry-run] [--json]
  anhedral ship [directory] [--dry-run] [--json]
  anhedral adopt [directory] --provider vercel [--json]
  anhedral recover [directory] [--provider vercel|cloudflare] [--json]
  anhedral status [directory] [--refresh] [--json]
  anhedral manage [directory] [--local] [--json]
  anhedral verify [directory] [--json]
  anhedral rollback [directory] --release <id> --data-compatible [--json]

--skip-install skips the final workspace install; the official shadcn bootstrap
still requires network access and may install its own dependencies.
--all is intentionally unsupported: select only required capabilities.
Vercel Hobby is personal/non-commercial with limits; commercial apps need a suitable existing plan.
`;
