---
root: false
targets: ["*"]
description: "Secrets management, environment variables protection, API key safety, and client-side sensitive data handling"
globs: ["**/*", ".env*"]
---

# Security & Secrets Management

## 1. Zero Secrets in Client Code (Zero Leaks Policy)
- **Frontend Public Nature**: Remember that all code, bundled assets, and environment variables with `VITE_` prefix shipped in Vite are publicly readable in the client's browser.
- **Forbidden in Frontend**:
  - ❌ Never hardcode secret API keys, private tokens, OAuth client secrets, or private credentials inside JavaScript/JSX files.
  - ❌ Never store unencrypted passwords or highly sensitive personal identifiable information (PII) in browser `localStorage` or `sessionStorage`.

## 2. Environment Variables & `.env` Protection
- Always declare secret configurations in `.env.local` or environment secrets, and ensure `.env.local`, `.env.*.local` are listed in `.gitignore`.
- Only expose variables prefixed with `VITE_` if they are non-sensitive public endpoints (e.g. `VITE_API_BASE_URL`).
- Provide `.env.example` with dummy/placeholder values as a template for other developers.

## 3. Client-Side Data Safety & Input Sanitization
- **XSS Prevention**: Rely on React's built-in JSX escaping for rendering strings. Avoid `dangerouslySetInnerHTML` unless explicitly sanitized.
- **Input Sanitization**: Trim and sanitize all text input before saving to in-memory state or transmitting over mock services.
