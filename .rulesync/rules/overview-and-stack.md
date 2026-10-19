---
root: false
targets: ["*"]
description: "Project technology stack, runtime architecture, and development workflow"
globs: ["**/*"]
---

# Project Overview & Tech Stack

## Project Identity

- **Project Type**: React single-page application for parking management.
- **Core Areas**: Authentication, vehicle management, parking history, search, filtering, pagination, and form interactions.

## Technology Stack

- **Framework**: React 19 with function components and hooks.
- **Language**: JavaScript with modern ES features.
- **Routing**: React Router DOM.
- **Build Tool**: Vite.
- **Styling**: Tailwind CSS v4, with shared global styles where needed.
- **Package Manager**: npm, using `package.json` and `package-lock.json`.
- **Quality Tools**: ESLint and Prettier according to the scripts and configuration in the repository.

## Architecture Direction

- Keep page composition and UI state in page-level modules.
- Keep reusable UI behavior in components that communicate through props and callbacks.
- Isolate backend communication, data mapping, validation, and domain operations in feature services or API client modules.
- Keep components independent from transport details so the data source can evolve without rewriting the UI.

## Development Commands

```bash
npm install
npm run dev
npm run lint
npm run build
npm run preview
```
