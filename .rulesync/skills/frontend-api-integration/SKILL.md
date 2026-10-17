---
name: frontend-api-integration
description: "Workflow to integrate, structure, and mock API endpoints, client services, error envelopes, and async state"
targets: ["*"]
---

# Workflow: Frontend API Integration (`frontend-api-integration`)

Use this skill when implementing, refactoring, or consuming API/service endpoints in the frontend application.

## 1. Service Layer Abstraction
- All API and asynchronous data access must reside under `src/features/[domain]/[domain]Service.js` (e.g. `src/features/contacts/contactsService.js`).
- Never make direct `fetch` / `axios` calls or mock array manipulations inside presentational components.
- Standardize method signatures: `getAll(params)`, `getById(id)`, `create(data)`, `update(id, data)`, `delete(id)`, `search(query)`.

## 2. Asynchronous State Lifecycle Handling
Always account for the 5 key UI states during API integration:
1. **Initial / Idle State**: Clean state before trigger.
2. **Loading State**: Toggle loading indicators (`isLoading` / `setLoading(true)`), disable duplicate submit triggers.
3. **Success State**: Update UI state, sync list/data, close modal, and show feedback.
4. **Empty State**: Explicitly handle zero items returned (`data.length === 0`).
5. **Error State**: Catch errors gracefully, prevent app crash, log details, and display user-friendly error banners.

## 3. Data Contracts & Security
- **Data Sanitization**: Validate and trim payload fields prior to transmission.
- **Contract Assumptions**: Validate response fields against expected schema before binding to UI components.
- **Secrets Protection**: Never hardcode API keys or auth tokens in service code. Use non-secret `VITE_` environment variables for base URLs only.

## 4. Verification Checklist
- [ ] Async methods return Promises and simulate realistic latency (e.g. 200-300ms in mocks).
- [ ] Errors are properly caught and do not cause uncaught Promise rejections.
- [ ] Component handles slow network without double-submission bugs.
