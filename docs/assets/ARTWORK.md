# Default stack artwork

`render-stack.mjs` is the canonical source for both dark and light diagrams.
`stack-logos.json` retains only the eight vendor marks used by this illustration
from the earlier published artwork. Logos identify the products; they do not imply
endorsement. The stack standard owns application behavior.

Regenerate SVGs with:

```sh
node docs/assets/render-stack.mjs
```

With the inspector's existing development dependencies and Google Chrome installed,
regenerate SVGs and PNGs together:

```sh
node docs/assets/render-stack.mjs --png
```

Each image is 1920 × 1080. Commit both themes and formats together. README and stack
reference pages use the static PNGs; those two images are included in the npm package
so relative image references remain available. The renderer, icon source and SVGs
are documentation source, outside the published runtime.

The main path shows Expo web/iOS/Android → Hono → Drizzle/D1 and private R2.
Better Auth, shared styling and workspace tools are quiet supporting defaults.
Only Stripe and RevenueCat appear as optional additions. The diagram describes
source architecture, not provisioned or verified provider state.

The website should reuse these generated SVGs for
`apps/landing/public/work/anhedral-cli-stack.svg` and `anhedral-cli-stack-light.svg`.
Keep the page's semantic descriptions and generated asset fingerprints synchronized
when copying a reviewed revision. Do not maintain a second independent diagram layout.
