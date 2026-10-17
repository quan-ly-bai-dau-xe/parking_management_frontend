---
name: frontend-component-architecture
description: "Workflow to design decoupled, reusable, and accessible React UI components adhering to Tailwind CSS standards"
targets: ["*"]
---

# Workflow: Frontend Component Architecture (`frontend-component-architecture`)

Use this skill when creating or refactoring UI components to maintain strict 4-layer separation and clean component contracts.

## 1. Component Boundaries & Responsibilities
Follow the 4-layer architecture:
```text
Page Layer (src/pages/ContactManagerPage.jsx)
  ↓ Props & Callbacks
Component Layer (src/components/ContactList.jsx, ContactForm.jsx, SearchBar.jsx, Pagination.jsx)
  ↓ Business Logic / Domain Calls
Feature Service Layer (src/features/contacts/contactsService.js)
```

- **Presentational / Dumb Components**: Pure UI rendering driven strictly by props. No direct service or API imports.
- **Single Responsibility Principle**: Each component must do one thing well (e.g. `SearchBar` only handles search input and triggers `onSearchChange`).
- **Preserve Public Interfaces**: Maintain existing prop names (`contacts`, `onEdit`, `onDelete`, `onSave`) unless deprecation is planned and agreed upon.

## 2. Component Design & Prop Contracts
- **Destructuring with Safe Defaults**:
  ```jsx
  const ContactList = ({ 
    contacts = [], 
    onEdit = () => {}, 
    onDelete = () => {} 
  }) => { ... };
  ```
- **Controlled Form Elements**: Form components (`ContactForm`) must manage controlled inputs and emit plain JavaScript objects on submit.

## 3. Styling & Accessibility Standards
- Use Tailwind CSS classes (`flex`, `items-center`, `px-3`, `py-2`, `rounded-md`, `overflow-x-auto`).
- Avoid inline CSS (`style={{ ... }}`). Custom CSS belongs in scoped component stylesheets.
- Ensure proper semantic HTML (`<button>`, `<table>`, `<form>`) and accessibility tags (`aria-label`, `role`).

## 4. Verification Checklist
- [ ] Component is decoupled from backend / API details.
- [ ] Props have safe fallback defaults to prevent `undefined` runtime crashes.
- [ ] Key props are unique and stable when rendering arrays.
