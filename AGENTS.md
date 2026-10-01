# PROJECT THREE KINGDOMS — Agent Rules

## 1. AI-OS
This repository adopts `nanpsw-eng/AI-OPERATING-SYSTEM` Stable v0.4.4 at exact commit `64b5115a698cc6a94cd8df80abb2ee7109010764`.
Read `docs/ai-dev/AI_OS_BINDING.md` before substantive repository work and load only the AI-OS context needed for the current task.

## 2. Source of Truth
1. User approval owns intent and authority.
2. `docs/product/PRD.md` owns product requirements and acceptance criteria.
3. `docs/decisions/` owns durable design/architecture decisions.
4. Repository state owns current implementation state.
5. Test evidence owns verification state. GitHub Actions is not required for validation; only actually executed local/Codex/CI evidence may support PASS.
6. `docs/ai-dev/SESSION_HANDOFF.md` owns the current recovery index.

Do not treat chat summaries as a replacement for these sources.

## 3. Approved product baseline
Do not reopen these decisions without new evidence or explicit user request:
- Modernized classic army RPG, not belt-scroll action.
- Mobile-first portrait UX.
- Tap-to-Move default; Virtual d-pad optional.
- Visible Encounter; random encounters are not the default.
- Maximum 5 active generals.
- Smart Command: default attacks preselected; user changes only needed actions.
- Troop count is the primary survival resource.
- Character core identity stats remain largely fixed; growth emphasizes troops/tactics.
- Region-based Semi-open fields.
- No global enemy level scaling.
- No gacha rarity or duplicate-general limit-break system.
- TypeScript/Zod schemas + JSON content.

## 4. Architecture hard rules
- Domain game logic must not import React or Phaser.
- Phaser owns world/battle rendering and animation, not game rules.
- React owns responsive UI, menus, overlays, battle commands, accessibility.
- Battle logic should be deterministic from `BattleState + Commands + RNG seed` where practical.
- Do not use `Math.random()` directly inside deterministic domain logic.
- Content and save state must remain separate.
- Static derived stats must not be redundantly persisted in save files.
- New generals/tactics/quests should be data-driven unless a genuinely new engine capability is required.

## 5. Mobile quality floor
- Primary validation widths: 360, 390, 412px.
- Critical gameplay must be operable by touch only.
- Core touch targets should target at least 44px, preferably 48px.
- Do not assume mouse hover.

## 6. IP guardrail
Use classic Three Kingdoms RPG mechanics only as inspiration. Do not copy original game sprites, portraits, maps, UI, music, dialogue, proprietary data tables, or distinctive creative assets.

## 7. Execution state vocabulary
- `NOT_STARTED != IMPLEMENTED`
- `NOT_RUN != PASS`
- `IMPLEMENTED != VALIDATED`
- Missing evidence remains `UNKNOWN` or `NOT_RUN`.

## 8. Repository workflow
Prefer the smallest safe change. Do not perform unrelated refactors. For substantive repository changes, update `docs/ai-dev/SESSION_HANDOFF.md` before ending the session.

### CI / validation policy
- Initial development policy is `LOCAL_FIRST / GITHUB_ACTIONS_DISABLED`.
- Do not add `.github/workflows/*` unless the user explicitly reopens and approves ADR-004.
- Keep validation commands as repository scripts so the same checks can run in local environments, Codex, or later CI environments.
- A check may be recorded as `PASS` only when its actual execution evidence is available. `NOT_RUN != PASS`.
- Recommended validation surface as implementation grows: typecheck, lint, unit tests, content/schema/reference validation, deterministic battle/golden tests, build, and risk-appropriate mobile E2E.

Production deploy, destructive migration, public release, paid services, or policy-changing actions require explicit human approval.
