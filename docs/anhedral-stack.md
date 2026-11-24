# Stack diagram

The [stack diagram](assets/anhedral-stack.svg) shows the clients, backend, storage and event sync in the
progressive scaffold. [Stack standard](stack-standard.md) owns architecture and
[capabilities](capabilities.md) owns composition and acceptance.

Regenerate the 1120 × 536 light/dark SVGs with
`node docs/assets/render-stack.mjs`; add `--png` to export the README PNGs. This
uses checked-in vendor logo data offline. Supply `sharp` through the checkout or
`DOCS_NODE_MODULES`. Commit both themes/formats together. Keep vendor attribution
and the website's neutral theme adaptations when refreshing its shared layout.
The CLI README embeds the light and dark SVGs.
