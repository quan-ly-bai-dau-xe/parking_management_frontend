---
root: false
targets: ["*"]
description: "Frontend performance optimization, bundle size management, render efficiency, and asset handling"
globs: ["src/**/*.{js,jsx,css}", "public/**/*"]
---

# Frontend Performance & Render Optimization

## 1. Render Optimization & React State Safety
- **Avoid Unnecessary Re-renders**:
  - Keep state as local as possible; avoid lifting state to parent pages if only a single child component needs it.
  - Wrap expensive calculations (such as large list filtering/sorting) in `useMemo`.
  - Pass stable callback references with `useCallback` when passing handlers to memoized list items.
- **Key Prop Invariants**:
  - Always assign stable, unique IDs as `key` attributes when mapping arrays (e.g. `key={contact.id}`).
  - Never use array index (`key={index}`) for dynamic, re-orderable, or filterable lists.

## 2. Asset & Bundle Management
- **SVG & Icon Sprites**: Utilize centralized SVG sprites (`public/icons.svg`) or optimized vector icons instead of heavy individual image files.
- **Image Optimization**: Ensure hero images and static assets are compressed and scaled appropriately.
- **Lazy Loading**: Utilize code-splitting and dynamic imports (`React.lazy` / `Suspense`) if pages or modals grow significantly.

## 3. DOM & Interaction Efficiency
- **Search Debounce**: When handling real-time keyword search across large datasets, debounce input triggers (e.g., 200-300ms) to avoid lagging the UI thread.
- **CSS Transitions**: Keep animations lightweight using GPU-accelerated CSS properties (`transform`, `opacity`) instead of layout-triggering properties (`width`, `height`, `top`).
