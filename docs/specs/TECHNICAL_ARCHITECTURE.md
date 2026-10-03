# TECHNICAL ARCHITECTURE v0.1

## Approved stack baseline
- TypeScript strict
- React
- Vite
- Phaser 4
- Zod + JSON content
- IndexedDB + Dexie
- vite-plugin-pwa
- Vitest
- Playwright
- Vercel static deployment candidate
- Supabase deferred for future auth/cloud save

## Logical boundaries
React owns responsive UI and accessibility. Phaser owns world/battle rendering and animation. Pure TypeScript domain modules own game rules. Persistence is separate from content definitions.

`React UI -> typed controller/bridge -> domain core`
`Phaser runtime -> typed controller/bridge -> domain core`

Domain modules must not import React or Phaser.

## Battle core
Prefer a deterministic interface such as `resolveTurn(state, commands, rng) -> nextState/events`.

## Persistence
Vertical Slice source of truth is local IndexedDB. Cloud save is a future sync/backup capability, not a prerequisite for gameplay.

## PWA
Manifest and service worker via Vite PWA tooling. Cache application shell and versioned static assets; do not treat service-worker cache as save storage.

## Scenes
Initial Phaser scenes: Boot, Preload, World, Battle. Menus/inventory/character/quest screens stay in React.

## Validation
Initial validation is **Local/Codex-first** and GitHub Actions remains disabled by approved ADR-004 even though the repository is public.

Repository scripts provide the portable validation contract regardless of execution surface. The target set is: typecheck, lint, unit tests, content/schema/reference validation, deterministic battle/golden tests and build. Release-candidate validation adds mobile E2E, save migration, PWA and critical journey.

Do not create `.github/workflows/*` unless ADR-004 is explicitly reopened and approved. `NOT_RUN != PASS`; only observed execution evidence may establish verification state.

## Implementation order
1. TypeScript/Vite/React scaffold
2. Zod schemas + content validator
3. deterministic battle core + unit/golden tests
4. React↔Phaser bridge
5. World scene + Tap-to-Move
6. Battle scene + mobile battle UI
7. Dexie save/recovery
8. Vertical Slice content
9. PWA
10. mobile E2E / playtest build
