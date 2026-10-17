---
root: false
targets: ["*"]
description: "Testing strategy, manual verification flows, boundary testing, and post-modification regression checks"
globs: ["src/**/*", "tests/**/*"]
---

# Frontend Testing & Verification Standards

## 1. Testing Strategy
All feature implementations, bug fixes, and refactorings must be verified across three distinct levels:
1. **Business Logic & Service Verification**:
   - Verify CRUD operations in `contactsService.js` (unique ID creation, record update, deletion filtering).
   - Test search filtering with case-insensitive queries, partial matches, and empty queries.
   - Test pagination math: total pages calculation, slice bounds, first/last page boundary handling.
2. **Form & Validation Verification**:
   - Test required field enforcement (e.g., Name cannot be empty or whitespace).
   - Test email regex validation (reject invalid structures like `name@`, `name@.com`).
   - Test phone number format validation and numeric restrictions.
3. **UI & User Flow Verification**:
   - Modal lifecycle: Opening empty form for creation vs. pre-filled form for editing vs. cancelation without side effects.
   - List rendering: Displaying correct badge color for status tags (`Active`, `Inactive`, `Frequent user`, `New user`).
   - Empty state: Clear display when no contacts exist or search keyword yields 0 results.

## 2. Post-Modification Verification Checklist
Before declaring any task complete:
- [ ] Run `npm run build` to verify there are no compilation errors, missing modules, or broken imports.
- [ ] Open browser DevTools Console to ensure zero React runtime errors (e.g. missing `key` prop on lists).
- [ ] Check responsive layout on 375px (Mobile) and 1200px+ (Desktop).
- [ ] Perform a sanity smoke test: Add a contact -> Search for it -> Edit it -> Delete it.
