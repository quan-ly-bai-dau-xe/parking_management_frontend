---
name: frontend-feature-workflow
description: "End-to-end workflow for delivering features and bug fixes with minimal surgical edits and comprehensive verification"
targets: ["*"]
---

# Workflow: Frontend Feature Delivery (`frontend-feature-workflow`)

Use this skill when implementing new end-to-end features, enhancements, or bug fixes across the frontend application.

## 1. Trace Requirements & Dependencies
Before writing code:
1. Clarify the user request and user stories against SRS (`docs/02-srs.md`).
2. Trace all affected layers:
   - UI / Components (`src/components/`)
   - Page Orchestration & State (`src/pages/`)
   - Feature Services & Data Contracts (`src/features/`)
   - Stylesheets / Assets (`src/assets/`, `public/`)
3. Identify edge cases (empty states, duplicate inputs, boundary pagination, mobile layout).

## 2. Implement Minimal & Surgical Changes
- Formulate a clear plan before modifying code.
- Implement the smallest complete change that satisfies the requirement without breaking existing behavior.
- Preserve existing coding conventions (React 19 hooks, Tailwind CSS classes, ES6+ syntax).
- Avoid modifying unrelated components, dependencies, or configuration files.

## 3. Verification & Quality Gates
Execute systematic verification after implementation:
1. **Lint Check**: Ensure code adheres to project style without unused variables or broken imports:
   ```bash
   npm run lint
   ```
2. **Build Check**: Validate production bundling:
   ```bash
   npm run build
   ```
3. **Manual Sanity Check**: Run dev server (`npm run dev`) and test the user flow from end to end.

## 4. Delivery & Reporting
- Report exact files modified or created.
- Summarize changes concisely with clear rationale.
- Report verification test results and highlight any remaining considerations.
