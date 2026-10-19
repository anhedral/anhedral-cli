// Regenerate both self-contained SVGs: node docs/assets/render-stack.mjs
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('./', import.meta.url);
const { logos } = JSON.parse(readFileSync(new URL('stack-catalog.json', root), 'utf8'));
for (const light of [false, true]) {
  const bg = light ? '#fafafa' : '#0d1117',
    surface = light ? '#ffffff' : '#151b23',
    border = light ? '#e3e5e8' : '#3d444d',
    ink = light ? '#202327' : '#f0f6fc',
    muted = light ? '#7a8089' : '#9198a1',
    wire = light ? '#c6cbd2' : '#59636e';
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080" role="img" aria-labelledby="title desc"><title id="title">Anhedral basic stack</title><desc id="desc">Expo web, iOS and Android connect to Hono on Cloudflare. Hono owns Better Auth, Drizzle/D1 and private R2. Supporting UI, workspace and distribution tools are grouped below. Backend capabilities are optional additions.</desc><rect width="1920" height="1080" fill="${bg}"/>`,
  ];
  const text = (x, y, s, size = 24, color = ink, anchor = 'middle') =>
    out.push(
      `<text x="${x}" y="${y}" fill="${color}" text-anchor="${anchor}" font-family="Arial,Helvetica,sans-serif" font-size="${size}">${s}</text>`,
    );
  const icon = (d, x, y, size) => {
    if (!logos[d]) throw Error(`Missing ${d}`);
    out.push(`<image href="${logos[d]}" x="${x}" y="${y}" width="${size}" height="${size}"/>`);
  };
  const tile = (cx, cy, d, label, size = 104) => {
    const x = cx - size / 2,
      y = cy - size / 2;
    out.push(
      `<rect x="${x}" y="${y}" width="${size}" height="${size}" rx="24" fill="${surface}" stroke="${border}" stroke-width="1.5"/><rect x="${cx - 28}" y="${cy - 28}" width="56" height="56" rx="12" fill="white"/>`,
    );
    icon(d, cx - 23, cy - 23, 46);
    text(cx, cy + size / 2 + 37, label, 24);
  };
  const connect = (x1, y1, x2, y2) => {
    const m = (x1 + x2) / 2;
    out.push(
      `<path d="M${x1} ${y1}C${m} ${y1} ${m} ${y2} ${x2} ${y2}" fill="none" stroke="${wire}" stroke-width="2.5" stroke-linecap="round"/>`,
    );
  };
  text(96, 99, 'Anhedral', 42, ink, 'start');
  text(1824, 95, 'THE BASIC STACK', 16, muted, 'end');
  // Three balanced stages. Uniform horizontal curves meet the icon edges.
  text(384, 218, 'CLIENTS', 16, muted);
  text(960, 218, 'API', 16, muted);
  text(1536, 218, 'SERVICES', 16, muted);
  for (const y of [320, 475, 630]) connect(436, y, 900, 475);
  for (const y of [320, 475, 630]) connect(1020, 475, 1484, y);
  tile(384, 320, 'expo.dev', 'Expo web');
  tile(384, 475, 'apple.com', 'Expo iOS');
  tile(384, 630, 'android.com', 'Expo Android');
  tile(960, 475, 'hono.dev', 'Hono', 120);
  tile(1536, 320, 'better-auth.com', 'Better Auth');
  tile(1536, 475, 'orm.drizzle.team', 'Drizzle + D1');
  tile(1536, 630, 'cloudflare.com', 'Private R2');
  text(960, 602, 'Shared contracts', 20, muted);
  // Quiet supporting panels: no extra wiring or explanatory paragraphs.
  const panels = [
    {
      x: 96,
      w: 540,
      title: 'INTERFACE',
      rows: [
        ['reactnativereusables.com', 'React Native Reusables'],
        ['nativewind.dev', 'NativeWind + shared tokens'],
        ['ui.shadcn.com', 'shadcn conventions'],
      ],
    },
    {
      x: 690,
      w: 540,
      title: 'WORKSPACE',
      rows: [
        ['typescriptlang.org', 'TypeScript'],
        ['pnpm.io', 'pnpm + Turborepo'],
        ['eslint.org', 'ESLint'],
      ],
    },
    {
      x: 1284,
      w: 540,
      title: 'HOSTING &amp; DELIVERY',
      rows: [
        ['cloudflare.com', 'Cloudflare Workers'],
        ['expo.dev', 'EAS / local builds'],
        ['apple.com', 'App Store + Google Play'],
      ],
    },
  ];
  for (const p of panels) {
    out.push(`<rect x="${p.x}" y="800" width="${p.w}" height="208" rx="18" fill="${surface}"/>`);
    text(p.x + 30, 840, p.title, 14, muted, 'start');
    for (const [i, [domain, label]] of p.rows.entries()) {
      const y = 879 + i * 44;
      icon(domain, p.x + 30, y - 22, 26);
      text(p.x + 72, y, label, 22, ink, 'start');
    }
  }
  out.push('</svg>');
  writeFileSync(new URL(`anhedral-stack${light ? '-light' : ''}.svg`, root), out.join('\n') + '\n');
}
