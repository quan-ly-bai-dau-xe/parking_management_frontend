---
root: false
targets: ["*"]
description: "Verification gates, build integrity, runtime sanity checks, and completion requirements before reporting done"
globs: ["**/*"]
---

# Verification & Pre-Delivery Gates

## 1. Completion Definition (Definition of Done)
A task or bug fix is considered **complete** only when it satisfies all of the following criteria:
1. **Requirements Met**: All functional and non-functional requirements specified in the task description are implemented.
2. **Clean Build**: The project builds successfully with `npm run build` without TypeScript/Rollup errors or missing asset warnings.
3. **Runtime Health**: Dev server launches cleanly (`npm run dev`) with zero uncaught exceptions in browser developer console.
4. **Visual & Responsive Verification**: Tested on both mobile viewport (<768px) and desktop (>992px) with correct layout alignment.
5. **No Regressions**: Existing CRUD operations, search filtering, and pagination continue to function normally.

## 2. Mandatory Verification Process
Before reporting completion to the user, execute:
```bash
# 1. Run production build verification
npm run build

# 2. Inspect git status for untracked/dirty files
git status
```

## 3. Clear Verification Report
When delivering results to the user:
- Summarize what was changed and the specific files modified.
- Outline the concrete verification steps performed and their outcomes (e.g. `npm run build` passed).
- Highlight any important notes, design trade-offs, or follow-up recommendations.
