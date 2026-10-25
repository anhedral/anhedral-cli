---
name: anhedral-design
description: "Explain and extend the scaffold's shared tokens, DOM shadcn UI and Anhedral native shadcn ports."
---

# Anhedral Design

Read the generated app's instructions and source. Web uses Next.js App Router and DOM shadcn components; native uses Expo and the editable Anhedral native shadcn port in packages/native-ui. Share contracts and tokens, not platform primitives. Keep theme tokens in packages/styling and use existing components before introducing custom primitives.

Use the generated apps/web ui:add and ui:view scripts for official web shadcn components. Native APIs and device acceptance differ; inspect the copied native component source and ../../references/native-ui.md before adapting it. Preserve keyboard focus, accessibility labels, loading/error states and platform-specific interaction. Read version-matched framework guidance and test the requested user flow.

This skill describes a foundation. Application authentication, billing, integrations and hosting are consumer-owned work; choose separate provider plugins or official SDKs when requested.
