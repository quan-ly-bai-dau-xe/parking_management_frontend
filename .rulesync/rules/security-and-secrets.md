---
root: false
targets: ["*"]
description: "Frontend secrets, API boundaries, and client-side data safety"
globs: ["**/*", ".env*"]
---

# Security & Secrets

- Never place private API keys, tokens, credentials, or server-only secrets in frontend source, committed files, or `VITE_` variables.
- Treat every `VITE_` variable and bundled asset as publicly readable in the browser.
- Keep local secrets in ignored `.env.*.local` files and provide only safe placeholders in `.env.example` when needed.
- Centralize API calls in feature services or API client modules; do not scatter transport logic across presentational components.
- Do not store passwords or highly sensitive personal data in `localStorage` or `sessionStorage`.
- Rely on React's escaping for normal text rendering; avoid `dangerouslySetInnerHTML` unless content is explicitly sanitized.
- Trim and validate user input before submission, and handle server errors without exposing sensitive details.
