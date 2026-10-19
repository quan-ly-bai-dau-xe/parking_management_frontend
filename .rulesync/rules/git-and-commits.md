---
root: false
targets: ["*"]
description: "Git workflow, commit message conventions, atomic commits, and forbidden destructive Git operations"
globs: ["**/*"]
---

# Git & Commit Standards

## 1. Commit Message Conventions
Follow the **Conventional Commits** specification with clear, concise English commit messages:

```text
<type>(<scope>): <short description in imperative mood>

[optional body explaining why the change was made]
```

### Standard Commit Types:
- `feat`: A new feature (e.g., `feat(vehicle): add pagination to vehicle list`).
- `fix`: A bug fix (e.g., `fix(validation): handle invalid form input`).
- `refactor`: Code changes that neither fix bugs nor add features (e.g., `refactor(service): extract search filter helper`).
- `style`: Formatting, missing semicolons, or CSS adjustments without logic changes.
- `docs`: Documentation updates or rule changes (e.g., `docs(rules): update project structure rules`).
- `chore`: Tooling, build config, or dependency updates (e.g., `chore(deps): update vite dependencies`).

## 2. Atomic & Clean Commit Policy
- **One Logical Change per Commit**: Keep commits atomic and focused. Do not mix refactoring with feature delivery or unrelated formatting changes.
- **Stage Selectively**: Do not run indiscriminate `git add .` if unintended temporary files or scratch artifacts exist. Always review `git status` and `git diff` before committing.

## 3. Forbidden Dangerous Git Operations (Strict AI & Developer Safety)
- ❌ **FORBIDDEN**: `git push --force` or `git push -f` on shared/main branches.
- ❌ **FORBIDDEN**: `git reset --hard` without explicit human confirmation and backup of unstaged work.
- ❌ **FORBIDDEN**: Autonomous committing and pushing without human developer review and consent.
- ❌ **FORBIDDEN**: Modifying or rewriting published git history.
