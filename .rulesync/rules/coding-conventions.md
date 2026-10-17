---
root: false
targets: ["*"]
description: "Coding conventions, language standards, formatting, and best practices for React and JavaScript"
globs: ["src/**/*.{js,jsx,css}", "docs/**/*.md"]
---

# Frontend Coding Conventions & Best Practices

## 1. Tech Stack & Language Standards
- **Framework & Runtime**: React 18 (Function Components only with Hooks).
- **Language**: JavaScript (ES6+) with clear modern idioms (destructuring, arrow functions, template literals, optional chaining `?.`, nullish coalescing `??`).
- **Bundler & Build Tool**: Vite (`http://localhost:5173`).
- **Styling**: Tailwind CSS utility classes as primary styling mechanism; avoid inline styles.

## 2. File & Directory Naming Conventions
- **Component Files**: PascalCase (e.g., `ContactForm.jsx`, `ContactList.jsx`, `Pagination.jsx`).
- **Service & Utility Files**: camelCase (e.g., `contactsService.js`, `formatters.js`, `validators.js`).
- **Stylesheets**: PascalCase matching the component/page name (e.g., `ContactManagerPage.css`) or kebab-case for shared assets.
- **Component Folder Pattern**: When grouping components, place each component inside its dedicated directory or feature folder with matching `.jsx` and optional `.css`.

## 3. Component Architecture & Coding Standards
- **Function Components**: Use pure function components with React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`).
- **Hook Invariants**: Never call hooks conditionally or within nested loops. Always declare hooks at the top level of the component.
- **Props Management**:
  - Always destructure props with explicit fallback/default values.
  - Keep prop interfaces clean, explicit, and well-documented with JSDoc if necessary.
- **State Immutability**:
  - Never mutate state directly (e.g., avoid `array.push()`, `obj.prop = value`).
  - Always return new array or object references using spread syntax (`[...prev, newItem]` or `{ ...prev, key: value }`).

## 4. Code Formatting & Clean Code Tenets
- **Indentation**: 2 spaces.
- **Quotes**: Double quotes (`"`) for JSX attributes/strings, or consistent single quotes (`'`) in standard JS.
- **Semicolons**: Consistent semicolon usage throughout the codebase.
- **Naming Conventions**:
  - Variables and functions: `camelCase` (e.g., `handleContactSubmit`, `filteredContacts`).
  - Constants and Enums: `UPPER_SNAKE_CASE` (e.g., `DEFAULT_PAGE_SIZE`, `TAG_TYPES`).
  - Boolean variables / flags: Prefix with `is`, `has`, or `should` (e.g., `isLoading`, `hasError`, `isOpen`).
  - Event Handlers: Prefix with `handle` on definitions (`handleSearchChange`) and `on` for prop callbacks (`onSearchChange`).
- **Comments & Documentation**: Explain *why* a complex business decision was made, not just *what* standard code does.
