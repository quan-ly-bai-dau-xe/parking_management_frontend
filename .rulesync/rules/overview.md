---
root: true
targets: ["*"]
description: "Parking Management Frontend project rules and engineering standards directory index"
globs: ["**/*"]
---

This repository contains the Parking Management Frontend, built with React 19 and Vite.

## Core Rules

- Inspect only files directly relevant to the current task. Do not explore the entire repository by default.
- Avoid broad commands such as `tree`, recursive directory listings, and unrestricted file searches. Use targeted paths and limit output.
- Never enumerate `node_modules/`, `dist/`, `build/`, `.git/`, or generated files during routine exploration.
- Read only necessary file sections. Do not repeatedly inspect files or run equivalent searches.
- Expand investigation only when necessary to resolve uncertainty or verify a change. Identify missing information before broadening the search.
- Preserve existing user changes. Avoid unrelated modifications and refactoring.
- Verify changes with relevant tests when appropriate; balance correctness with token efficiency.

## Documentation Index

- **`docs/00-overview.md`** — Read when you need the product context, goals, scope, or high-level project overview.
- **`docs/01-architecture.md`** — Read when you need to understand the system structure, module boundaries, or intended technical architecture.
- **`docs/02-srs.md`** — Read when implementing or reviewing functional requirements, user flows, or acceptance criteria.
- **`docs/04-coding-convention.md`** — Read when creating or modifying code and you need the project's detailed coding conventions.
- **`docs/05-testing.md`** — Read when writing, reviewing, or executing test cases, smoke tests, and test specifications.
- **`docs/design-system/design-tokens.md`** — Read when styling UI and you need the verified color, typography, spacing, radius, elevation, or status tokens from the design system.
- **`docs/design-system/type-styles.md`** — Read when defining or changing typography and you need the verified font families, sizes, weights, line heights, or letter spacing.
- **`docs/design-system/component-inventory.md`** — Read when selecting or extending reusable UI components and you need the currently verified component, variant, and property inventory.
- **`docs/plan.md`** — Read when planning work, checking project milestones, or understanding the intended implementation sequence.
- **`docs/Quan ly bai dau xe oto_SRS_v4.1.docx`** — Read when detailed Vietnamese SRS requirements are needed and the other requirement documents do not provide enough context.

## Documentation

Read relevant files under `docs/` only when needed. Do not load all rules, documentation, or skills by default.
