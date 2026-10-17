---
root: false
targets: ["*"]
description: "Project technology stack, architecture runtime, operational workflow, and development environment setup"
globs: ["**/*"]
---

# Project Overview & Tech Stack

## 1. Project Identity & Purpose
- **Project Name**: Parking Management Frontend
- **Project Type**: Single Page Application (SPA) - Frontend CRUD Application
- **Core Functionality**: Create, Read, Update, Delete (CRUD), full-text search, filtering, and paginated contact directory.

## 2. Core Technology Stack
- **Framework**: React 18 (Function Components exclusively, React Hooks).
- **Language**: JavaScript (ES6+) with modern standard features (async/await, destructuring, optional chaining).
- **Build Tool & Bundler**: Vite (Fast HMR, optimized production rollup bundle).
- **UI Framework & Styling**: Tailwind CSS (Utility-first CSS framework; responsive utilities, modern layout design).
- **Icons & Assets**: SVG icon sprite (`public/icons.svg`) and static vector assets.
- **Package Manager**: npm (`package.json`, `package-lock.json`).

## 3. How the Application Operates
- **Client-Side Runtime**: Runs completely on the client side in modern web browsers.
- **State & Data Management**:
  - In-memory contact store managed via Feature Service abstraction (`src/features/contacts/contactsService.js`).
  - Asynchronous mock API simulation prepares the application for seamless future REST backend integration without UI refactoring.
- **Local Development Environment**:
  ```bash
  npm install      # Install dependencies
  npm run dev      # Launch Vite development server at http://localhost:5173
  npm run build    # Production bundle verification
  npm run preview  # Preview production build locally
  ```
