# Default stack artwork

`render-stack.mjs` is the canonical source for both dark and light diagrams.
`stack-logos.json` retains only the eight vendor marks used by this illustration
from the earlier published artwork. Logos identify the products; they do not imply
endorsement. The stack standard owns application behavior.

Regenerate SVGs with:

```sh
node docs/assets/render-stack.mjs
```

With `sharp` available (or `DOCS_NODE_MODULES` pointing to its node_modules directory),
regenerate SVGs and PNGs together:

```sh
node docs/assets/render-stack.mjs --png
```

Each image is 1920 × 1080. Commit both themes and formats together. README and stack
reference pages use the static PNGs; those two images are included in the npm package
so relative image references remain available. The renderer, icon source and SVGs
are documentation source, outside the published runtime.

The main path shows Next.js → Hono → Drizzle/D1 + Better Auth. Private R2,
services and additional clients branch from that foundation. WXT owns the optional
Chrome Side Panel entrypoint. The diagram describes source architecture, not
provisioned or verified provider state.

The website uses its own neutral light/dark variants generated from the shared
layout. Preserve those theme adaptations when updating the CLI's navy artwork;
keep page descriptions and asset fingerprints synchronized with copied revisions.
