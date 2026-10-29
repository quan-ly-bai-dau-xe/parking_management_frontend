---
name: implement-ui
description: "End-to-end workflow and implementation guidelines for building or refactoring UI pages and components adhering to the design system"
targets: ["*"]
---

# Workflow: UI Implementation (`implement-ui`)

Use this skill when implementing new UI pages, refactoring existing views, or building UI components in the Parking Management Frontend system.

---

## 1. Documentation & Design System References

Before writing UI code, consult the canonical project design system documents in `docs/design-system/`:

- **Design Tokens**: [`docs/design-system/design-tokens.md`](docs/design-system/design-tokens.md)  
  *Colors, elevation, borders, spacing, and status color tokens.*
- **Components & Patterns Inventory**: [`docs/design-system/component-inventory.md`](docs/design-system/component-inventory.md)  
  *Reusable shared primitives (`DataTable`, `TableActions`, `Pagination`, `FilterSelect`, `ConfirmModal`, `LoadingSpinner`, `EmptyState`) vs reference page patterns.*
- **Typography & Font Styles**: [`docs/design-system/type-styles.md`](docs/design-system/type-styles.md)  
  *Font scales, tracking, line heights, and contextual guidelines.*
- **Reference UI Page**: [`src/pages/CustomerManagement.jsx`](file:///e:/code/parking_management/parking_management_frontend/src/pages/CustomerManagement.jsx)  
  *Canonical implementation example demonstrating search bar, filter popover, table interactions, modal forms, and pagination.*

---

## 2. Implementation Procedure

Follow this 5-step lifecycle when developing any operational page or UI feature:

### Step 1: Layout Shell & Page Orchestration
- Wrap the page in the centralized layout:
  - Global app shell: Ensure route is nested within `<AppLayout>` in `src/App.jsx`.
  - Main container: `<main className="bg-[#FAF8FF] min-h-screen px-4 sm:px-6 lg:px-10 py-6 space-y-6">`.
- Build the **Page Header**:
  - Title (`H1`): `text-xl sm:text-2xl font-bold text-slate-900 tracking-tight`.
  - Subtitle: `text-xs sm:text-sm text-slate-500 mt-1`.
  - Primary Action / CTA on the right (e.g., `bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold px-4 py-2.5`).

### Step 2: Metrics / KPI Cards (When Required)
- Grid layout: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`.
- Card surface: `bg-white rounded-xl border border-slate-200 p-4 shadow-2xs`.
- Icon box: `w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg` with soft semantic background (`bg-blue-50 text-blue-600`, etc.).

### Step 3: Search & Filter Toolbar
- Toolbar container: `bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3`.
- Search input with left search icon: `pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-blue-500`.
- Display `<kbd>Ctrl+K</kbd>` badge for keyboard shortcut hint when applicable.
- Use `FilterSelect` for select dropdowns.
- Provide a reset filters button when any active filter is applied.

### Step 4: Content Presentation & State Handling
Always handle the 4 fundamental UI states:
1. **Loading State**: Render `LoadingSpinner` centered or skeleton placeholders matching table geometry.
2. **Error State**: Render clear error message with a "Retry" CTA without crashing or unmounting the page shell.
3. **Empty State**: Render `EmptyState` when dataset is empty or no filter matches found (icon, title, hint, and clear filter action).
4. **Success State**: Render `DataTable` or data grid:
   - Header row: `bg-slate-50 border-b border-slate-200`, `th`: `text-left text-2xs sm:text-xs font-semibold text-slate-500 uppercase px-4 py-3`.
   - Data rows: `hover:bg-slate-50/75 transition-colors border-b border-slate-100 last:border-b-0`.
   - Data cells: `px-4 py-3.5 text-xs text-slate-700 align-middle`.
   - Primary Identifiers: `font-semibold text-slate-900`.
   - Actions: Reuse `TableActions` for edit/delete buttons.

### Step 5: Pagination & Modals
- **Pagination**: Use `usePagination` hook and `Pagination` component at the bottom of the table card.
- **Modals (Form / Confirm)**:
  - Backdrop: `fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4`.
  - Surface: `bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg sm:max-w-xl overflow-hidden`.
  - Reuse `ConfirmModal` for destructive/confirmation flows.

---

## 3. Verification Checklist

Before completing UI work:
- [ ] No arbitrary colors or inline styles (`style={{ ... }}`) used where design tokens apply.
- [ ] Responsive behavior verified on mobile (`sm:`, `lg:` breakpoints).
- [ ] Keyboard shortcut shows `Ctrl+K` (never `⌘K`).
- [ ] All 4 UI states (Loading, Error, Empty, Success) are covered.
- [ ] Reusable components from `src/components/common/` are leveraged rather than duplicated.
- [ ] `npm run lint` and `npm run build` pass cleanly without errors.
