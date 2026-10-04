# ADR-003 — Content and Persistence

## Status
APPROVED — 2026-10-01

## Decision
Use TypeScript/Zod schemas with JSON content definitions. Use IndexedDB through Dexie for local save data. Defer Supabase until cloud save/auth is actually required.

## Consequences
- Content changes are schema-validated and data-driven.
- Static content is separated from runtime/save state.
- Save schema must be versioned and migratable.
- No backend is required for the Vertical Slice.
