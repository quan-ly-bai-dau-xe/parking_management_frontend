---
root: false
targets: ["*"]
description: "Directory responsibilities, layered architecture, module organization, and file placement rules"
globs: ["src/**/*", "public/**/*"]
---

# Project Structure & Directory Responsibilities

## 1. Directory Tree Overview
```text
Frontend-Intern-Mockup/
├── .rulesync/              # Project governance, rules, skills, and agent configs
├── docs/                   # Full documentation (SRS, Architecture, UI, Conventions)
├── public/                 # Static assets (favicons, SVG sprite definitions)
└── src/
    ├── assets/             # Images, graphics, and static media files
    ├── components/         # Pure presentational and reusable UI components
    ├── features/           # Domain feature services, business logic, mock data
    ├── pages/              # Orchestration views and page-level layouts
    ├── App.jsx             # Root application component
    └── main.jsx            # Application entry point (ReactDOM rendering)
```

## 2. Directory Responsibilities & Boundary Rules
- **`src/components/` (UI Layer)**:
  - Contains reusable presentational components (`SearchBar.jsx`, `ContactList.jsx`, `ContactForm.jsx`, `Pagination.jsx`).
  - Strict Rule: Components must remain agnostic of network or storage details. Data and actions are passed strictly via props.
- **`src/features/` (Service & Business Logic Layer)**:
  - Encapsulates domain logic, data models, validation schemas, and mock API services (`src/features/contacts/contactsService.js`).
  - Strict Rule: No JSX or direct DOM manipulation is allowed within feature services.
- **`src/pages/` (Page Orchestration Layer)**:
  - Manages view orchestration, page-level state (search keyword, pagination, active modal), and integrates services with UI components (`ContactManagerPage.jsx`, `ContactManagerPage.css`).
- **`src/assets/` & `public/`**:
  - `src/assets/`: Media processed by bundler (hero images, logos).
  - `public/`: Raw static assets served directly at root path (e.g. `public/icons.svg`).
