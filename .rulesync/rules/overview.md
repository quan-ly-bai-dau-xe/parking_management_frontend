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

## Frontend Clean Code & React Guardrails

Mandatory standards when writing and modifying Frontend code (React 19 + Tailwind CSS):

### 1. State & Async Hygiene
- **Double-click Prevention**: Must use `useRef` (synchronous lock) alongside `useState` (for visual loading/disabled button states) to prevent duplicate concurrent triggers.
- **Cleanup Timers & Subscriptions**: All `setTimeout`, `setInterval`, WebSocket connections, and `AbortController` instances must be cleaned up in the `useEffect` unmount handler to prevent memory leaks.
- **Reset Stale State**: Always clear previous error and success states before initiating a new API request or asynchronous action.
- **Isolate Error Mappers**: Never hardcode long/complex error messages inline in `catch` blocks. Extract them into dedicated pure error mapper helpers.

### 2. UI Preservation & Surgical Edits
- **Preserve Original UI & Layout**: Keep the existing HTML/Tailwind structure, CSS classes, labels, and font styling intact when resolving business logic issues. Never fabricate unrequested UI elements, cards, badges, dialogs, or placeholders.
- **Surgical Edits**: Touch only the exact lines/blocks required to fulfill the request. Avoid ripple refactoring in surrounding components.

### 3. Component Size & Clean Code Standards
- **File Length Limits**:
  - React Component: maximum **< 200 lines**. Decompose into sub-components if exceeded.
  - Custom Hook: maximum **< 120 lines**.
- **Component Reuse**: Actively reuse standard shared components located in `src/components/common/` (Button, Input, Modal, Table, etc.) instead of recreating redundant markup.
- **Data Integrity**: Never invent simulated or fake AI confidence scores (`aiConfidence`), ticket statuses, pricing, or parking fees when missing from the API.

## Reference Reading and Context Reuse

- Read referenced documentation when it is relevant to the current task and its contents are not already available in the current context.
- Reuse previously read, unchanged content instead of rereading the same file.
- Re-read a reference only when its contents may have changed, the existing context is incomplete, or clarification is needed to resolve a conflict.
- Prefer the smallest set of references that fully supports the task.

## Documentation Index

- **`docs/00-overview.md`** — Read when you need the product context, goals, scope, or high-level project overview.
- **`docs/01-architecture.md`** — Read when you need to understand the system structure, module boundaries, or intended technical architecture.
- **`docs/02-srs.md`** — Read when implementing or reviewing functional requirements, user flows, or acceptance criteria.
- **`docs/04-coding-convention.md`** — Read when creating or modifying code and you need the project's detailed coding conventions.
- **`docs/05-testing.md`** — Read when writing, reviewing, or executing test cases, smoke tests, and test specifications.
- **`docs/design-system/design-tokens.md`** — Read when styling UI and you need verified color, typography, spacing, radius, elevation, or status tokens.
- **`docs/design-system/component-inventory.md`** — Read when selecting or extending reusable UI components and patterns.
- **`docs/design-system/type-styles.md`** — Read when defining typography scales and contextual styling guidelines.
- **`docs/plan.md`** — Read when planning work, checking project milestones, or understanding the intended implementation sequence.
- **`docs/Quan ly bai dau xe oto_SRS_v4.1.docx`** — Read when detailed Vietnamese SRS requirements are needed and the other requirement documents do not provide enough context.

## Documentation

Read relevant files under `docs/` only when needed. Do not load all rules, documentation, or skills by default.
