---
name: rules-and-skills-maintenance
description: "Audit, evolve, validate, and synchronize project rules, skills, and engineering conventions when dependencies, architecture, or UI standards change."
targets: ["*"]
---

# Workflow: Rules & Skills Maintenance (`rules-and-skills-maintenance`)

Use this skill when auditing, updating, synchronizing, or introducing new **Rules** and **Skills** across the repository's `.rulesync` ecosystem to ensure engineering standards and team conventions remain accurate, consistent, and strictly enforced across all AI agents and team members.

---

## 1. Trigger Conditions

Activate this workflow when any of the following events occur:

- **Technology & Dependency Changes**: Core runtime or build tool updates (e.g., React, Vite, Tailwind CSS), new major dependencies added, or modifications in `package.json`.
- **Architecture & Shared Primitive Evolution**: Adding, refactoring, or deprecating shared UI components in `src/components/common/` (e.g., `ConfirmModal`, `TableActions`, `FilterSelect`, `Pagination`, `DataTable`).
- **Drift Detection**: Any discrepancy identified between implementation code, specifications under `docs/`, and standards defined in `.rulesync/rules/`.
- **Explicit User Instructions**: Whenever a developer or team lead requests updating team guidelines, adding coding conventions, or synchronizing AI instructions.

---

## 2. Core Guardrails & Invariants

1. **Single Source of Truth**: All rule and skill edits **must originate in `.rulesync/` first**, and then synchronize out to `.agents/` or other target IDE configurations. Never make one-off edits exclusively in `.agents/`.
2. **No Downgrading Rules**: Never relax or weaken rules, linters, or type/test constraints simply to bypass errors or avoid writing tests.
3. **Surgical & Minimal Edits**: Update only the clauses and scopes directly affected by the change; preserve all existing unrelated conventions.
4. **Frontmatter Integrity**: Every rule and skill file must maintain valid YAML frontmatter:
   - Rules: `root` (boolean), `targets` (array), `description` (string), `globs` (array).
   - Skills: `name` (string), `description` (string), `targets` (array).
5. **Transparency & Human Review**: Clearly summarize any modified, added, or removed conventions in the response so the human developer/team lead can inspect and approve the change.

---

## 3. Four-Step Maintenance Lifecycle

### Step 1: Audit & Drift Detection
- Cross-check runtime versions in `package.json` against `.rulesync/rules/coding-conventions.md` and `.rulesync/rules/overview-and-stack.md`.
- Inspect `src/components/common/index.js` against UI architecture rules to identify new or modified shared primitives.
- Compare existing files under `docs/` against `## Documentation Index` in `.rulesync/rules/overview.md`.

### Step 2: Edit & Authoring in `.rulesync/`
- **When Updating an Existing Rule**: Edit directly in `.rulesync/rules/<rule-name>.md`.
- **When Adding a New Rule**:
  - Place file in `.rulesync/rules/<rule-name>.md`.
  - Provide valid frontmatter with targeted `globs` and informative `description`.
  - Update `## Documentation Index` or rule index in `.rulesync/rules/overview.md` if the rule is foundational.
- **When Updating or Creating a Skill**:
  - Place instructions in `.rulesync/skills/<skill-name>/SKILL.md`.
  - Follow the standard structure: Purpose, Trigger Conditions, Guardrails, Step-by-Step Procedure, and Verification Checklist.

### Step 3: Synchronization (Sync)
- Mirror modified files from `.rulesync/` to corresponding targets under `.agents/`:
  - Rules: `.rulesync/rules/*` → `.agents/rules/*`
  - Skills: `.rulesync/skills/*` → `.agents/skills/*`
  - Root & Agents Config: Update `AGENTS.md` whenever core rule indexes or project boundaries change.

### Step 4: Verification Checklist
Before completing the maintenance task, verify:
- [ ] YAML frontmatter parses correctly with valid attributes.
- [ ] Referenced file links (`docs/*`, `src/*`, `.rulesync/*`) exist and point to valid targets.
- [ ] No conflicting or mutually exclusive instructions exist across rules.
- [ ] Target mirrors under `.agents/` are fully synchronized with `.rulesync/`.
- [ ] The human developer receives an explicit summary of what changed and why.
