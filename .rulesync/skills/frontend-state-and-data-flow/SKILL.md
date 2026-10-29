---
name: frontend-state-and-data-flow
description: "Workflow for managing React 19 state ownership, immutable data flow, derived state, and mutation lifecycles"
targets: ["*"]
---

# Workflow: Frontend State & Data Flow (`frontend-state-and-data-flow`)

Use this skill when designing, refactoring, or debugging component state, data flow, and state synchronization.

## 1. State Ownership & Placement Rules
- **Local State (`useState`)**: Keep state as close to where it is used as possible (e.g. form inputs inside `ContactForm.jsx`).
- **Lifted Page State**: Lift state to page orchestrator (`ContactManagerPage.jsx`) only when multiple sibling components share it (e.g. `contacts`, `searchQuery`, `currentPage`).
- **No Unjustified Global State**: Do not introduce Redux, Zustand, or complex context unless application requirements justify cross-page global access.

## 2. Derived State vs. Redundant State
- **Calculate On-the-Fly**: Avoid storing derived values in separate state variables if they can be calculated during render or memoized.
  ```jsx
  // Preferred: compute filtered data directly or via useMemo
  const filteredContacts = useMemo(() => {
    if (!searchQuery) return contacts;
    return contacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [contacts, searchQuery]);
  ```
- Keep page resets in sync (e.g. reset `currentPage` to 1 whenever search query or filters change).

## 3. Immutability & Safe Mutations
- **Pure State Updates**: Always treat React state as immutable.
  ```jsx
  // Create / Append
  setContacts(prev => [newContact, ...prev]);

  // Update
  setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));

  // Delete
  setContacts(prev => prev.filter(c => c.id !== deletedId));
  ```
- Never mutate state variables directly (`contacts.push()`, `contacts[0].name = '...'`).

## 4. Verification Checklist
- [ ] No race conditions on rapid state updates or search typing.
- [ ] UI immediately reflects state changes without requiring manual refresh.
- [ ] State updates do not trigger infinite `useEffect` loops.
