---
root: false
targets: ["*"]
description: "Mandatory page layout standards and UI structure requirements across all operational views"
globs: ["src/pages/**/*.{js,jsx}", "src/components/**/*.{js,jsx}"]
---

# Page Layout & UI Uniformity Standards

This rule establishes the mandatory requirements for page layouts, structural hierarchy, and visual consistency across all operational views in the Parking Management Frontend system.

---

## 1. Core Mandatory Rules

1. **Centralized Layout Routing**:
   - All management/operational routes must be nested under `AppLayout` in `src/App.jsx`.
   - Pages must not instantiate their own standalone global navigation header.
   - Main container must use semantic `<main>` with consistent background `bg-[#FAF8FF]` and padding `px-4 sm:px-6 lg:px-10 py-6 space-y-6`.

2. **Standard 6-Section Hierarchy**:
   Every operational page follows a predictable top-to-bottom layout:
   ```text
   1. AppTopHeader (provided globally by AppLayout)
   2. Page Header: Title (H1) + Subtitle + Primary Action CTA
   3. (Optional) KPI / Metric Stat Cards Grid
   4. Filter & Search Toolbar (Search bar, FilterSelect, Popover)
   5. Main Content: DataTable / Grid / Entity List
   6. Pagination Footer (usePagination & Pagination)
   ```

3. **Mandatory 4 UI Lifecycle States**:
   Every page must explicitly handle and display:
   - **Loading State**: `LoadingSpinner` centered or skeleton placeholders.
   - **Error State**: Non-crashing alert with a retry option.
   - **Empty State**: Centralized `EmptyState` component with informative feedback.
   - **Success State**: Complete interactive data table or card grid.

4. **Reuse Verified Primitives**:
   - Inspect and reuse components from `src/components/common/` (`DataTable`, `TableActions`, `Pagination`, `FilterSelect`, `ConfirmModal`, `LoadingSpinner`, `EmptyState`).
   - Do not re-implement custom pagination, confirm dialogs, or action buttons when shared primitives satisfy the requirement.

5. **Keyboard Shortcuts Convention**:
   - Search triggers and keyboard shortcut badges must display `Ctrl+K`.
   - Never use macOS-specific symbols like `⌘K`.
