---
name: architecture-guidelines
description: "Guide frontend changes that add features, pages, components, services, or cross-module behavior using the project's architecture."
targets: ["*"]
---

Use this skill when a task changes module boundaries, adds a feature or page, introduces a reusable component, or prepares frontend code for backend integration.

Read `docs/01-architecture.md` before making architectural decisions. Read only additional documentation required by the task.

For UI architecture, also read the relevant files under `docs/design-system/` so new components use existing tokens, type styles, and component patterns.

- Place code in the existing project areas that match its responsibility; do not invent parallel structures.
- Keep reusable UI separate from feature-specific logic.
- Keep API calls and backend-facing transformations at an explicit service or integration boundary.
- Do not introduce mock or in-memory data as a substitute for backend behavior unless the user explicitly requests a temporary test fixture.
- Preserve existing routing, state ownership, and public interfaces unless the task requires a change.
- Prefer the smallest change that satisfies the requirement and explain any unavoidable boundary change.

Before finishing, check imports, route integration, loading/error/empty states, and the relevant verification rules.
