---
name: frontend-testing
description: "Workflow for testing frontend React components, validation logic, user interaction flows, and build integrity"
targets: ["*"]
---

# Workflow: Frontend Testing & Verification (`frontend-testing`)

Use this skill when executing tests, verifying bug fixes, auditing UI interactions, and performing pre-commit checks.

## 1. Unit & Logic Verification
- **Validation Rules**:
  - Test required field validations (empty name, whitespace).
  - Test email regex patterns (`valid@example.com` vs invalid strings).
  - Test phone number validation and numeric constraints.
- **Service Layer Operations (`contactsService.js`)**:
  - Verify CRUD operations: ID generation on `create`, record update on `update`, filtering on `delete`, query matching on `search`.
  - Verify Pagination mathematics: boundary handling on first/last page, total items calculation.

## 2. Component Interaction & State Flow
- **Search & Filter Flow**:
  - Verify typing in `SearchBar` updates filtered list in real-time.
  - Verify clearing search resets list and returns to page 1.
- **Modal Lifecycle**:
  - Verify "Add new contact" initializes empty form.
  - Verify "Edit" pre-populates form with active contact fields.
  - Verify canceling modal dismisses dialog without persisting unsaved modifications.

## 3. UI & Accessibility Auditing
- Audit browser console for React warnings (e.g. missing `key` props, invalid DOM nesting).
- Verify responsive layout across mobile (<768px), tablet (768px-991px), and desktop (≥992px).
- Verify accessible buttons (`aria-label`), keyboard navigation, and visible focus states.

## 4. Build & Lint Verification
Execute before finalizing any feature:
```bash
npm run lint
npm run build
```
Never claim verification or tests passed without actual test execution results.
