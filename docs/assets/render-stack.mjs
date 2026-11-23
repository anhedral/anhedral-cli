// Canonical artwork: node docs/assets/render-stack.mjs [--png]
// PNG export uses optional sharp tooling; set DOCS_NODE_MODULES to its package directory.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const root = new URL('./', import.meta.url);
const { logos, glyphs } = JSON.parse(readFileSync(new URL('stack-logos.json', root), 'utf8'));
export const stackSize = { width: 1120, height: 536 };

export function renderStack(light = false) {
  const surface = light ? '#ffffff' : '#252524';
  const border = light ? '#d6d6d4' : '#464644';
  const ink = light ? '#171717' : '#fafafa';
  const muted = light ? '#565654' : '#bdbdb9';
  const line = light ? '#82827d' : '#878781';
  const wordmarkSvg = readFileSync(new URL('anhedral-wordmark.svg', root), 'utf8').replace(
    'fill="currentColor"',
    `fill="${ink}"`,
  );
  const wordmark = Buffer.from(wordmarkSvg).toString('base64');
  const { width, height } = stackSize;
  const svgImage = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  const glyph = (key) => svgImage(glyphs[key].replace('<svg ', `<svg fill="${ink}" `).replaceAll('currentColor', ink));
  const card = (x, y, icons, title, detail, command) => `
  <g transform="translate(${x} ${y})">
    <rect width="304" height="150" rx="10" fill="${surface}" stroke="${border}"/>
    ${icons.map((logo, i) => `<image href="${logo}" x="${22 + i * 39}" y="13" width="30" height="30"/>`).join('')}
    <text x="22" y="73" font-size="24" font-weight="600">${title}</text>
    <text x="22" y="99" font-size="16" fill="${muted}">${detail}</text>
    <text x="22" y="132" font-family="Menlo,Consolas,monospace" font-size="14">anhedral ${command}</text>
  </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc" font-family="Helvetica Neue,Helvetica,Arial,sans-serif" fill="${ink}">
  <title id="title">Anhedral Stack</title>
  <desc id="desc">Start with a blank Turborepo. Add TanStack Start, WXT, Expo and Electron clients in any order. They share a Hono API with Better Auth and Drizzle ORM on Neon Postgres. Select private R2 storage and per-account Durable Objects with hibernating WebSockets for event sync.</desc>
  <defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L6 4L1 7" stroke="${line}" stroke-width="1.3" fill="none"/></marker></defs>
  <image href="data:image/svg+xml;base64,${wordmark}" x="44" y="30" width="248" height="32"/>
  <text x="308" y="61" font-size="30" fill="${muted}">Stack</text>
  <text x="44" y="94" font-size="19" fill="${muted}">Start with a blank Turborepo · anhedral init my-app</text>
  <g transform="translate(0 -24)">
  <g fill="none" stroke="${line}" stroke-width="1.6" stroke-linejoin="round">
    <path d="M348 214H370Q378 214 378 222V388Q378 396 370 396H348"/>
    <path d="M378 305H406" marker-end="url(#arrow)"/>
    <path d="M712 305H742"/>
    <path d="M742 305V222Q742 214 750 214H770" marker-end="url(#arrow)"/>
    <path d="M742 305V388Q742 396 750 396H770" marker-end="url(#arrow)"/>
  </g>
${card(44, 139, [logos['tanstack.com'], logos['wxt.dev']], 'Web and extension', 'TanStack Start · WXT', 'add web web-extension')}
${card(44, 321, [logos['expo.dev']], 'Mobile and desktop', 'Expo · Electron', 'add mobile desktop')}
${card(408, 230, [logos['hono.dev'], glyph('betterauth'), logos['orm.drizzle.team']], 'Hono API + Better Auth', 'Drizzle ORM on Neon Postgres', 'add api db auth')}
${card(772, 139, [logos['cloudflare.com'], glyph('r2')], 'File storage', 'Private files on Cloudflare R2', 'add storage')}
${card(772, 321, [logos['cloudflare.com']], 'Hibernating WebSockets', 'One Durable Object per account', 'add client-sync')}
  </g>
  <text x="44" y="507" font-size="17" fill="${muted}">Optional additions: Commander CLI · Stripe payments · RevenueCat purchases · RealtimeKit calls</text>
</svg>\n`;
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
      await sharp(Buffer.from(svg), { density: 144 })
        .png()
        .toFile(new URL(`${name}.png`, root).pathname);
  }
  console.log('Rendered the progressive application stack in dark and light themes.');
}
