---
root: false
targets: ["*"]
description: "Code readability, clean code principles, minimal necessary edits, DRY tenets, and defensive programming"
globs: ["src/**/*.{js,jsx,css}"]
---

# Code Quality & Clean Code Standards

## 1. Minimal Necessary Edits (Surgical Changes)
- **Focused Scope**: Only modify the specific files and code lines required to resolve the issue or deliver the requested feature.
- **Preserve Existing Structure**: Avoid massive re-formatting, restructuring unrelated files, or altering unrelated business logic in unrelated components.
- **No Unused Code**: Clean up debug `console.log` statements, unused imports, commented-out dead code, and temporary variables before finalizing work.

## 2. Readability & Self-Documenting Code
- **Intent-Revealing Names**:
  - Functions: Use clear verbs describing action (e.g., `filterItemsByKeyword`, `validateForm`).
  - Variables: Use descriptive nouns (e.g., `activeItemId`, `isCreateModalOpen`).
  - Avoid cryptic single-letter abbreviations except for standard loops or index mapping (`i`, `idx`).
- **Meaningful Documentation**: Add clear comments explaining the rationale (*why*) for non-obvious business rules, regex patterns, or state synchronization workarounds.

## 3. DRY & Defensive Coding
- **Single Source of Truth**: Centralize reusable logic (email validation regex, phone formatting, badge color lookup) in utility or service modules.
- **Defensive Safeguards**:
  - Always provide fallback defaults when destructuring props or accessing nested objects (e.g., `item?.tags ?? []`).
  - Ensure array methods (`map`, `filter`, `reduce`) are called only on valid array instances.
