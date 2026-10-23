// Canonical artwork: node docs/assets/render-stack.mjs [--png]
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const root = new URL('./', import.meta.url);
const { logos } = JSON.parse(readFileSync(new URL('stack-logos.json', root), 'utf8'));
export const stackSize = { width: 1920, height: 1080 };
const escape = (value) =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');

export function renderStack(light = false) {
  const bg = light ? '#fafafa' : '#0d1117',
    surface = light ? '#ffffff' : '#151b23',
    border = light ? '#e3e5e8' : '#3d444d',
    ink = light ? '#202327' : '#f0f6fc',
    muted = light ? '#646c77' : '#9198a1',
    wire = light ? '#c6cbd2' : '#59636e';
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" role="img" aria-labelledby="title desc"><title id="title">Anhedral default application stack</title><desc id="desc">Next.js App Router web through Cloudflare OpenNext and Expo iOS/Android connect to a Hono API on Cloudflare Workers. Drizzle with D1 and private R2 are included. Better Auth, shared design tokens, separate web/native UI and workspace tools support the foundation. Stripe and RevenueCat provide optional payments, with entitlements enforced by Hono. Dotted branches show extension points for additional clients such as desktop, browser extensions and AR/XR, and integrations such as AI and realtime.</desc><rect width="1920" height="1080" fill="${bg}"/>`,
  ];
  const text = (x, y, value, size = 24, color = ink, anchor = 'middle') =>
    out.push(
      `<text x="${x}" y="${y}" fill="${color}" text-anchor="${anchor}" font-family="Arial,Helvetica,sans-serif" font-size="${size}">${escape(value)}</text>`,
    );
  const icon = (domain, x, y, size) => {
    if (!logos[domain]) throw Error(`Missing ${domain}`);
    out.push(`<image href="${logos[domain]}" x="${x}" y="${y}" width="${size}" height="${size}"/>`);
  };
  const tile = (cx, cy, domain, label, size = 104, labelGap = 37) => {
    out.push(
      `<rect x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" rx="24" fill="${surface}" stroke="${border}" stroke-width="1.5"/><rect x="${cx - 28}" y="${cy - 28}" width="56" height="56" rx="12" fill="white"/>`,
    );
    icon(domain, cx - 23, cy - 23, 46);
    text(cx, cy + size / 2 + labelGap, label, 26);
  };
  const additional = (cx, cy, size, examples) => {
    out.push(
      `<rect x="${cx - size / 2}" y="${cy - size / 2}" width="${size}" height="${size}" rx="20" fill="${surface}" stroke="${border}" stroke-width="1.5"/><path d="M${cx - 14} ${cy}h28M${cx} ${cy - 14}v28" fill="none" stroke="${ink}" stroke-width="3.5" stroke-linecap="round"/>`,
    );
    text(cx, cy + size / 2 + 29, 'Additional', 26);
    text(cx, cy + size / 2 + 57, examples, 18, muted);
  };
  const connect = (x1, y1, x2, y2, dotted = false) => {
    const middle = (x1 + x2) / 2;
    out.push(
      `<path d="M${x1} ${y1}C${middle} ${y1} ${middle} ${y2} ${x2} ${y2}" fill="none" stroke="${wire}" stroke-width="2.5"${dotted ? ' stroke-dasharray="7 9"' : ''} stroke-linecap="round"/>`,
    );
  };
  text(96, 99, 'Anhedral', 42, ink, 'start');
  text(1824, 95, 'DEFAULT APPLICATION STACK', 16, muted, 'end');
  text(384, 218, 'WEB & NATIVE CLIENTS', 16, muted);
  text(384, 245, 'App Router · OpenNext', 18, muted);
  text(960, 218, 'HONO API', 16, muted);
  text(1536, 218, 'DATA & FILES', 16, muted);
  for (const y of [300, 420, 540]) connect(424, y, 900, 475);
  connect(424, 660, 900, 475, true);
  for (const y of [360, 600]) connect(1020, 475, 1484, y);
  // Payment reconciliation belongs to Hono; a dashed connection marks optional scope.
  out.push(
    `<path d="M1020 510C1170 570 1170 650 1170 780" fill="none" stroke="${wire}" stroke-width="2.5" stroke-dasharray="7 9" stroke-linecap="round"/>`,
    `<path d="M960 415C960 300 1070 285 1126 285" fill="none" stroke="${wire}" stroke-width="2.5" stroke-dasharray="7 9" stroke-linecap="round"/>`,
  );
  tile(384, 300, 'nextjs.org', 'Next.js web', 80, 29);
  tile(384, 420, 'apple.com', 'Expo iOS', 80, 29);
  tile(384, 540, 'android.com', 'Expo Android', 80, 29);
  additional(384, 660, 80, 'Desktop · Browser Extension · AR/XR · etc.');
  additional(1170, 285, 88, 'AI · Realtime · etc.');
  tile(960, 475, 'hono.dev', 'Hono', 120);
  text(960, 605, 'Cloudflare Workers', 22, muted);
  text(960, 638, 'Authorization & shared contracts', 20, muted);
  tile(1536, 360, 'orm.drizzle.team', 'Drizzle / D1');
  text(1536, 486, 'SQL records', 20, muted);
  tile(1536, 600, 'cloudflare.com', 'Private R2');
  text(1536, 726, 'Owner-authorized files', 20, muted);

  out.push(`<rect x="96" y="780" width="540" height="240" rx="18" fill="${surface}"/>`);
  text(126, 823, 'INCLUDED SUPPORT', 14, muted, 'start');
  text(126, 877, 'Better Auth · shared contracts', 24, ink, 'start');
  text(126, 920, 'Web shadcn · native Anhedral port', 24, ink, 'start');
  text(126, 963, 'TypeScript · pnpm · Turborepo', 22, muted, 'start');
  out.push(`<rect x="690" y="780" width="1134" height="240" rx="18" fill="${surface}"/>`);
  text(720, 823, 'OPTIONAL PAYMENTS', 14, muted, 'start');
  for (const [x, domain, name, purpose] of [
    [740, 'stripe.com', 'Stripe', 'Web checkout'],
    [1300, 'revenuecat.com', 'RevenueCat', 'Native purchases'],
  ]) {
    out.push(`<rect x="${x}" y="860" width="72" height="72" rx="16" fill="white"/>`);
    icon(domain, x + 10, 870, 52);
    text(x + 102, 888, name, 30, ink, 'start');
    text(x + 102, 923, purpose, 22, muted, 'start');
  }
  text(1257, 984, 'Shared entitlements enforced by Hono', 20, muted);
  return out.concat('</svg>').join('\n') + '\n';
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (process.argv.slice(2).some((arg) => arg !== '--png'))
    throw Error('Usage: node docs/assets/render-stack.mjs [--png]');
  for (const light of [false, true])
    writeFileSync(new URL(`anhedral-stack${light ? '-light' : ''}.svg`, root), renderStack(light));
  if (process.argv.includes('--png')) {
    // Documentation tooling reuses the installed inspector browser dependency.
    // No browser/image renderer is added to the published CLI runtime.
    const require = createRequire(
      new URL('../../plugins/codex/inspector/package.json', import.meta.url),
    );
    const { chromium } = require('@playwright/test');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
      const page = await browser.newPage({ viewport: stackSize, deviceScaleFactor: 1 });
      for (const light of [false, true]) {
        const name = `anhedral-stack${light ? '-light' : ''}`;
        await page.goto(new URL(`${name}.svg`, root).href);
        await page.evaluate(async () => {
          await document.fonts.ready;
          await Promise.all(
            [...document.querySelectorAll('image')].map(
              (element) =>
                new Promise((resolve, reject) => {
                  const image = new Image();
                  image.onload = resolve;
                  image.onerror = reject;
                  image.src = element.getAttribute('href');
                }),
            ),
          );
        });
        await page.screenshot({ path: new URL(`${name}.png`, root).pathname });
      }
    } finally {
      await browser.close();
    }
  }
  console.log('Rendered the default stack and two optional payment providers.');
}
