// Canonical artwork: node docs/assets/render-stack.mjs [--png]
// PNG export uses optional sharp tooling; set DOCS_NODE_MODULES to its package directory.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = new URL('./', import.meta.url);
const { logos } = JSON.parse(readFileSync(new URL('stack-logos.json', root), 'utf8'));
export const stackSize = { width: 1600, height: 1040 };
const escape = (s) => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

export function renderStack(light = false) {
  const bg = light ? '#fafafa' : '#0d1117';
  const surface = light ? '#ffffff' : '#151b23';
  const border = light ? '#d8dee5' : '#343e49';
  const ink = light ? '#202830' : '#f0f6fc';
  const muted = light ? '#5d6977' : '#9aa7b5';
  const accent = light ? '#24766d' : '#89cabc';
  const wire = light ? '#9aa9b4' : '#657786';
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1040" viewBox="0 0 1600 1040" role="img" aria-labelledby="title desc">
<title id="title">Anhedral progressive application stack</title>
<desc id="desc">Begin with Next.js and OpenNext on Cloudflare Workers. Add Hono, then Drizzle, D1 and Better Auth. Independently add private R2, events, RTC, Workers AI, Expo with native UI, WXT with Chrome Side Panel support, GPUI, Stripe and RevenueCat. RevenueCat requires Expo and Stripe. UI source and shared theme tokens support web and native applications.</desc>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10" fill="${wire}"/></marker></defs>
<rect width="1600" height="1040" fill="${bg}"/>`,
  ];
  const text = (x, y, value, size = 22, color = ink) =>
    out.push(
      `<text x="${x}" y="${y}" fill="${color}" font-family="Arial,Helvetica,sans-serif" font-size="${size}">${escape(value)}</text>`,
    );
  const box = (x, y, w, h) =>
    out.push(
      `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="${surface}" stroke="${border}" stroke-width="1.5"/>`,
    );
  const line = (d, dashed = false, arrow = false) =>
    out.push(
      `<path d="${d}" fill="none" stroke="${wire}" stroke-width="2"${dashed ? ' stroke-dasharray="6 7"' : ''}${arrow ? ' marker-end="url(#arrow)"' : ''}/>`,
    );
  const icon = (domain, x, y, size = 38) => {
    out.push(
      `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="9" fill="${domain === 'nextjs.org' ? '#111111' : 'white'}"/><image href="${logos[domain]}" x="${x + 5}" y="${y + 5}" width="${size - 10}" height="${size - 10}"/>`,
    );
  };
  const row = (x, y, title, detail, domain) => {
    if (domain) icon(domain, x, y - 27, 36);
    const tx = x + (domain ? 50 : 0);
    text(tx, y, title, 24);
    text(tx, y + 29, detail, 17, muted);
  };
  text(70, 80, 'Anhedral', 40);
  text(70, 124, 'Progressive application stack', 24, muted);
  text(1230, 80, 'START SMALL. ADD AS NEEDED.', 14, accent);

  const stages = [
    [
      70,
      430,
      '01 / WEB FOUNDATION',
      'Next.js',
      'App Router · OpenNext',
      'Cloudflare Workers · Anhedral UI',
      'nextjs.org',
    ],
    [
      570,
      360,
      '02 / ADD AN API',
      'Hono',
      'API on Cloudflare Workers',
      'Shared contracts · server routes',
      'hono.dev',
    ],
    [
      1000,
      530,
      '03 / ADD DATA & IDENTITY',
      'Drizzle + D1 + Better Auth',
      'SQL schema · migrations · sessions',
      'Configure the authentication methods you need',
      'orm.drizzle.team',
    ],
  ];
  for (const [x, w, step, name, detail, note, domain] of stages) {
    text(x, 184, step, 14, accent);
    box(x, 208, w, 160);
    icon(domain, x + 24, 232, 42);
    text(x + 82, 263, name, name.length > 20 ? 25 : 30);
    text(x + 24, 308, detail, 21, muted);
    text(x + 24, 340, note, 17, muted);
  }
  line('M500 288H558', false, true);
  line('M930 288H988', false, true);

  line('M1265 368V425M300 478V425H1300V478', true);
  line('M800 425V478', true);
  line('M1300 425V478', true);
  text(70, 404, 'CHOOSE OPTIONAL ADDITIONS AFTER THE CORE FOUNDATION', 14, accent);
  box(70, 492, 460, 330);
  box(570, 492, 460, 330);
  box(1070, 492, 460, 330);
  text(96, 532, 'STORAGE & SERVICES', 14, muted);
  text(596, 532, 'ADDITIONAL APPLICATIONS', 14, muted);
  text(1096, 532, 'PAYMENTS & SUBSCRIPTIONS', 14, muted);
  row(96, 590, 'Private R2', 'Owner-scoped file storage', 'cloudflare.com');
  row(96, 674, 'Events + RTC', 'Event streams · realtime media APIs');
  row(96, 758, 'Workers AI', 'Text generation · usage quotas');
  row(596, 590, 'Expo', 'iOS / Android · optional native UI', 'expo.dev');
  row(596, 674, 'WXT', 'Browser extension + Chrome Side Panel');
  row(596, 758, 'GPUI', 'Native desktop application in Rust');
  row(1096, 590, 'Stripe', 'Web subscription checkout', 'stripe.com');
  row(1096, 674, 'RevenueCat', 'Mobile subscriptions · requires Expo + Stripe', 'revenuecat.com');
  text(1096, 770, 'Server-enforced entitlements', 20, muted);

  box(70, 864, 1460, 104);
  text(96, 902, 'ANHEDRAL UI', 14, accent);
  text(
    96,
    938,
    'Web: shadcn/ui   ·   Native: React Native Reusables + Anhedral extensions   ·   Shared theme tokens',
    22,
  );
  text(
    70,
    1009,
    'Editable source at every step. Provision, configure, validate and deploy when ready.',
    18,
    muted,
  );
  text(1325, 1009, 'UNDER CONSTRUCTION', 14, muted);
  return out.concat('</svg>').join('\n') + '\n';
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (process.argv.slice(2).some((arg) => arg !== '--png'))
    throw Error('Usage: node docs/assets/render-stack.mjs [--png]');
  let sharp;
  if (process.argv.includes('--png')) {
    const require = createRequire(
      process.env.DOCS_NODE_MODULES
        ? path.join(process.env.DOCS_NODE_MODULES, '_docs.cjs')
        : import.meta.url,
    );
    sharp = require('sharp');
  }
  for (const light of [false, true]) {
    const name = `anhedral-stack${light ? '-light' : ''}`;
    const svg = renderStack(light);
    writeFileSync(new URL(`${name}.svg`, root), svg);
    if (sharp)
      await sharp(Buffer.from(svg))
        .png()
        .toFile(new URL(`${name}.png`, root).pathname);
  }
  console.log('Rendered the progressive application stack in dark and light themes.');
}
