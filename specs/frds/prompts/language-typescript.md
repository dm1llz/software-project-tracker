---
{
  "id": "language-typescript-overlay",
  "kind": "language_overlay",
  "appliesWhen": ["language:typescript"],
  "priority": 50,
  "conflictsWith": [],
  "overridesSections": []
}
---

# Language Overlay: TypeScript

Apply when selected implementation language profile includes TypeScript (`.ts`/`.tsx`).

## TypeScript conventions (required)
1. Preserve strict typing; do not weaken compiler guarantees with `any` unless unavoidable and documented.
2. Prefer `type` aliases over `interface` by default to avoid accidental declaration merging behavior.
3. Use `interface` only when intentional extension/augmentation semantics are required and document why.
4. Prefer explicit domain types and discriminated unions for state/results over loosely shaped objects.
5. Keep runtime behavior and type contracts aligned; update guards/tests when type models change.
6. Favor small, pure utility functions in domain logic and isolate side effects at boundaries.
7. Use existing repository tooling and conventions (`tsc`, Vitest, Vite) for verification.
8. Prefer `unknown` + narrowing over unsafe assumptions when parsing external or file-based input.
9. For React TypeScript files:
   - keep props/state typed explicitly
   - avoid unnecessary re-renders by stabilizing callbacks/memo boundaries on hot paths
10. Update affected tests when changing public types, state contracts, or route/runtime behavior.
