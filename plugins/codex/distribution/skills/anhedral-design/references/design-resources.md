# Design resources

Use current documentation matching the target project's installed versions.
References inform design; repository rules and product requirements set the scope.

| Reference | Use |
| --- | --- |
| [Vercel guidelines](https://vercel.com/design/guidelines) | Interaction, focus, forms, layout, motion and performance review. Hosting remains a separate choice. |
| [shadcn Typeset](https://ui.shadcn.com/typeset) | Typography reference; assess hierarchy, measure and readability in the actual product. |
| [shadcn components](https://ui.shadcn.com/docs/components) / [MCP](https://ui.shadcn.com/docs/mcp) | Compatible primitives and registry examples. Prefer an available shadcn skill/plugin or MCP; otherwise use official docs/CLI. Inspect source/configuration before installation. |
| [React Bits](https://reactbits.dev/get-started/introduction) | Selected animated components/backgrounds. Review compatibility, dependencies, license and runtime cost before adapting examples. |
| [Tailwind CSS](https://tailwindcss.com/docs) | Utilities, theme tokens and responsive/state variants. Extend the workspace configuration. |
| [vgpu](https://vgpu.sh) / [examples](https://vgpu.sh/examples) | Shader/WebGPU scenes. Use installed specialist guidance or version-matched `vgpu docs`; verify lifecycle, fallback and GPU cost. |

Load only relevant resources. The local vgpu skill and external plugins are not
bundled dependencies. Keep essential UI usable without motion or GPU effects.
