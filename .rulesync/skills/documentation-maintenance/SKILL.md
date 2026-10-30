---
name: documentation-maintenance
description: "Create, update, or review project documentation (including docs/ and README.md) while keeping the documentation index concise and progressively disclosed."
targets: ["*"]
---

Use this skill when adding, editing, moving, or reviewing files under `docs/`, `README.md`, or when updating the documentation index in `.rulesync/rules/overview.md`.

- Keep the documentation index in English and list only actual files under `docs/`, including nested documentation directories when they are relevant.
- Use one entry per document with its name and one short sentence explaining when an AI should read it.
- When updating technical stack, scripts, or core architecture rules, ensure `README.md` stays synchronized with `docs/` and `.rulesync/rules/` (including development scripts like Storybook, lint, and build).
- Keep detailed content in the document itself; do not duplicate it in the index or in unrelated rules.
- Update links and references when a documented file is moved or renamed.
- Preserve the document's existing language and domain terminology unless the task explicitly requests a translation.
- Remove obsolete, mock-only, or unsupported project claims instead of preserving them for completeness.
- Read only the documentation relevant to the requested change and avoid broad documentation rewrites.

After editing, verify that every indexed `docs/` path exists, that `README.md` reflects current scripts and setup commands, and that the index still supports progressive disclosure.
