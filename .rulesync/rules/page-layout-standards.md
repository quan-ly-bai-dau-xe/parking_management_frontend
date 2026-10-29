---
root: false
targets: ["*"]
description: "Uniform page layout, structure, design tokens, and UI standards across all pages"
globs: ["src/pages/**/*.{js,jsx}", "src/components/**/*.{js,jsx}"]
---

# Page Layout & UI Uniformity Standards

This rule standardizes page layouts, visual hierarchy, tokens, responsive behavior, and user feedback patterns across all pages in the Parking Management Frontend system, based on the verified Design System (`docs/design-system/`).

---

## 1. Overall Page Layout Structure

All operational and management screens (excluding specialized authentication flows like Login) must follow a uniform top-down section hierarchy:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. AppTopHeader / Navigation (provided via AppLayout wrapper)         │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Page Header: Page Title (H1) + Subtitle + Primary Action Buttons    │
├────────────────────────────────────────────────────────────────────────┤
│ 3. (Optional) KPI / Metric Stat Cards Grid (2 to 4 columns)            │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Filter & Search Toolbar (Search bar, dropdown filters, popover)     │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Main Content: DataTable / Grid / Entity List (with Loading/Empty)   │
├────────────────────────────────────────────────────────────────────────┤
│ 6. Pagination Footer (Standard usePagination hook & Pagination UI)     │
└────────────────────────────────────────────────────────────────────────┘
```

- **Page Container**:
  - Wrap content within semantic `<main>` tag or utilize `<AppLayout>`.
  - Consistent background color: `bg-[#FAF8FF]` (Design Token: `color.background` / `color.surface`).
  - Base text color: `text-slate-800` or `text-[#0F172A]` (Design Token: `color.text.primary`).
  - Standard spacing: `px-4 sm:px-6 lg:px-10 py-6` with `space-y-6`.

---

## 2. Page Header Section

- **Position**: Located at the top of the main page container.
- **Title (H1)**:
  - Font styling: Bold (`font-bold text-slate-900 tracking-tight`).
  - Standard responsive sizing: `text-xl sm:text-2xl`.
- **Subtitle / Description**:
  - Font styling: `text-xs sm:text-sm text-slate-500 mt-1`.
  - Concise description explaining the purpose of the page.
- **Top Action Area (Primary CTA)**:
  - Placement: Positioned alongside the header on the right (`flex flex-col sm:flex-row sm:items-center justify-between gap-4`).
  - Primary Action Button: Brand blue background `bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold px-4 py-2.5 shadow-xs transition-colors`.

---

## 3. KPI & Metric Stat Cards (When Applicable)

- **Grid Layout**: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`.
- **Card Container**:
  - White surface: `bg-white rounded-xl border border-slate-200 p-4 shadow-2xs`.
  - Icon container: Soft rounded container `w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg`, styled with semantic pastel backgrounds (e.g., `bg-blue-50 text-blue-600`, `bg-rose-50 text-rose-600`, `bg-emerald-50 text-emerald-600`).
  - Label: `text-2xs sm:text-xs font-medium text-slate-500 uppercase tracking-wider`.
  - Value: `text-2xl font-bold text-slate-900 mt-0.5`.

---

## 4. Filter & Search Toolbar Section

- **Toolbar Container**:
  - White surface card: `bg-white rounded-xl border border-slate-200 p-4 shadow-2xs space-y-3`.
- **Search Input**:
  - Include search magnifying icon positioned left (`absolute left-3 text-slate-400`).
  - Dimensions & padding: `pl-9 pr-4 py-2 text-xs border border-slate-300 rounded-lg bg-white hover:border-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors`.
  - Clear placeholder (e.g., `Search by license plate, customer name, code...`).
  - Support `⌘K` / `Ctrl+K` keyboard shortcut where appropriate.
- **Filter Dropdowns (FilterSelect)**:
  - Rounded corners `rounded-lg`, border `border-slate-300`, typography `text-xs text-slate-700`, padding `px-3 py-2`.
- **Reset Filters Button**:
  - Provide a clean outline/ghost button with a reset icon when active filters are applied.

---

## 5. Main Data Table & List Container

- **Outer Card Container**:
  - `bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden`.
- **Card Header (When Applicable)**:
  - `p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3`.
  - Sub-heading title: `text-sm font-bold text-slate-900`.
- **Table Structure (`<table>` / `DataTable`)**:
  - Header row (`<thead>`): Light background `bg-slate-50 border-b border-slate-200`.
  - Header cells (`<th>`): `text-left text-2xs sm:text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3`.
  - Data rows (`<tr>`): `hover:bg-slate-50/75 transition-colors border-b border-slate-100 last:border-b-0`.
  - Data cells (`<td>`): `px-4 py-3.5 text-xs text-slate-700 align-middle`.
  - Primary Identifiers / Codes: Bold typography `font-semibold text-slate-900`.
  - Action column: Right or center aligned, utilizing the standard `TableActions` component.

---

## 6. Feedback & Lifecycle States

Every page **must** systematically support the 4 core UI states:
1. **Loading State**: Render centralized `LoadingSpinner` or skeleton cards matching the expected table/card geometry. Avoid blank screens or layout shifts.
2. **Error State**: Display a legible error message alongside a "Retry" button without crashing or unmounting the page shell.
3. **Empty State**: When no data matches filters or the dataset is empty, render the standard `EmptyState` component with:
   - Illustrative icon.
   - Descriptive title (e.g., `No results found`).
   - Actionable hint (e.g., `Try adjusting your search criteria or reset filters`).
   - Secondary action button (e.g., "Clear Filters" or "Add New").
4. **Success State**: Render the complete, responsive table or data grid.

---

## 7. Standard Pagination Footer

- Position at the bottom of the data table card or page container.
- Leverage the shared `usePagination` hook and `Pagination` component from `src/components/common/Pagination.jsx`.
- Display:
  - Page size selector (`Show 5 / 10 / 20 / 50 rows per page`).
  - Record range summary (`Showing X - Y of Z records`).
  - Navigation controls: First, Previous, Page Numbers (with ellipsis truncation), Next, Last.

---

## 8. Modals & Dialogs (Create, Edit, Confirm)

- **Backdrop Overlay**: `fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4`.
- **Modal Surface**: `bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg sm:max-w-xl overflow-hidden animate-in fade-in zoom-in-95`.
- **Modal Header**: `px-6 py-4 border-b border-slate-100 flex items-center justify-between` with a dismiss (X) button.
- **Modal Body**: `p-6 space-y-4 max-h-[75vh] overflow-y-auto`.
- **Form Controls**:
  - Field label: `text-xs font-semibold text-slate-700 mb-1 block`.
  - Input/Select: `w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none`.
  - Validation feedback: `text-2xs text-rose-500 mt-1`.
- **Modal Footer**: `px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3`.
  - Cancel Button: `px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors`.
  - Submit Button: `px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors`.
