---
root: false
targets: ["*"]
description: "Build, lint, runtime, and delivery verification gates"
globs: ["**/*"]
---

# Verification

Before reporting a code change complete:

- Run `npm run lint` when JavaScript, JSX, or configuration code changes.
- Run `npm run build` for changes that can affect compilation, routing, assets, or runtime behavior.
- Verify the changed user flow, including loading, empty, error, and success states where applicable.
- Check the browser console for uncaught errors and React warnings during UI changes.
- Check responsive behavior on mobile and desktop when layout or interaction changes.
- Inspect `git status` and the final diff; do not include unrelated user changes.

Use a focused manual smoke test when automated tests do not cover the changed behavior.
