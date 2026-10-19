---
root: false
targets: ["*"]
description: "Behavior-focused testing and regression checks"
globs: ["src/**/*", "tests/**/*"]
---

# Testing

Verify behavior at the appropriate level for each change:

- **Authentication**: login, logout, remember-me behavior, session restoration, and invalid credentials.
- **Routing**: navigation between available pages and valid handling of unknown routes.
- **Data flows**: loading, success, empty, error, and retry states for feature data.
- **Interactions**: search, filtering, pagination, selection, modal open/close, and form submission.
- **Validation**: required fields, whitespace-only values, invalid formats, and safe error messages.
- **Mutations**: create, update, and delete behavior when supported by the feature, including UI refresh and failure handling.

Use the repository's configured test tools when available. For UI changes without automated coverage, perform a focused manual smoke test and record the relevant flow.
