# Stack artwork

`stack-catalog.json` contains the 117 named technologies/platform options and
self-contained brand icons, copied from Anhedral's existing landing-page stack
catalog and `public/icons/stack` artwork. Logos identify their respective vendors;
they do not imply endorsement. The CLI registry and `docs/stack-standard.md` own
recipe behavior. This visual catalog includes manually configured ecosystem
options as well.

Run `node docs/assets/render-stack.mjs` to regenerate the dark and light SVGs.
Rasterize both at their intrinsic 1920 × 1080 size with an SVG renderer supporting
embedded PNG images (the current previews use Sharp). Commit SVGs and PNGs together.
The README references GitHub-hosted PNGs; artwork is excluded from the npm package.

The illustration shows only the basic connected application: Expo web/iOS/Android → Hono →
Better Auth / Drizzle + D1 / private R2, plus shared UI, contracts and workspace
tooling. Cloudflare hosts web and API. Backend/auth/data remain
opt-in capabilities; the illustration is not the plain-init selection manifest.
All other options stay in the README tables. Use large icons, minimal labels and
one thin horizontal Bézier connector style, inspired by the landing hero.

Dark palette sampled from the approved GitHub screenshot: canvas `#0d1117`,
panels `#151b23`, text `#f0f6fc`, muted text `#9198a1`, borders `#3d444d`.

## Anhedral identity

`brand/` contains logo and outlined wordmark exports in SVG and PNG, synchronized
from the shared masters in `anhedral-main`: black on white, white on black,
transparent black and transparent white. PNG logos are 1024 × 1024 and wordmarks
are 1856 × 240. Export black is pure `#000000`.
The README selects the appropriate banner for the viewer's theme. The Codex
plugin and inspector use `plugins/codex/distribution/assets/anhedral-mark.svg`
(charcoal) and `anhedral-mark-dark.svg` (white); both now use the three-blade mark.
Legacy mark artwork was replaced in place so existing manifest and MCP references
continue to resolve. These local changes do not update an installed plugin.
