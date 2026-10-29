---
root: false
targets: ["*"]
description: "Mandatory design system requirements, verified primitives reuse, and styling standards"
globs: ["src/**/*.{js,jsx,css}"]
---

# Design System Standards

This rule defines the mandatory design-system requirements for the Parking Management Frontend.

## Requirements

- **Follow the source of truth**: Use the design-system documentation in `docs/design-system/`. Do not treat example pages as authoritative when they conflict with the documented standards.
- **Reuse verified primitives**: Inspect and reuse existing components in `src/components/common/` when applicable. Do not create duplicate components or one-off patterns without a justified need.
- **Use verified design tokens**: Prefer the project's actual design tokens and established styling conventions. Do not invent token names, assume token aliases exist, or introduce arbitrary values when an established standard applies.
- **Preserve functional requirements**: Apply component and styling standards only when relevant to the page. Preserve accessibility, responsive behavior, and required UI states.
- **Handle exceptions explicitly**: When an existing component or standard does not fit the requirement, explain the reason and implement the smallest consistent exception.
- **Keep documentation and implementation aligned**: Verify component APIs, styling utilities, and token definitions against the actual codebase before relying on them.

