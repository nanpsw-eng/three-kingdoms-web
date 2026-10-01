# SESSION HANDOFF — Foundation Nightly (N0–N11 complete)

## Current State
- Repository: `nanpsw-eng/three-kingdoms-web` (`PUBLIC`, default branch `main`)
- Integration branch: `implementation/bootstrap` @ `75b4122` — Draft PR #1 → `main` (unchanged)
- Working branch: `implementation/foundation-nightly` (from `implementation/bootstrap` @ `75b4122`)
- Draft PR: #2 `implementation/foundation-nightly` → `implementation/bootstrap` (**do not merge without human approval**)
- Verified code HEAD: `4268d94` (later commits on this branch are docs-only unless stated in git log)
- Current Gate: `FOUNDATION_IMPLEMENTED / LOCAL_GATE_GREEN / REAL_DEVICE_NOT_RUN`
- Full evidence: `docs/reports/OVERNIGHT_FOUNDATION_REPORT.md`

## AI-OS Execution Snapshot
- AI-OS: `v0.4.4@64b5115a698cc6a94cd8df80abb2ee7109010764`
- Risk Tier: `RISK_MEDIUM`
- Agent Budget used: `1 writer / 0 reviewer` (SEQUENTIAL)
- CI Policy: `LOCAL_FIRST / GITHUB_ACTIONS_DISABLED` — **unchanged**; no `.github/workflows/*` added (local runtime covered all checks, so the conditional preapproval's condition 1 was not met)

## Recovery checklist for the next session
1. `git fetch origin && git checkout implementation/foundation-nightly`
2. `npm ci`
3. `npm run verify:foundation` (expects 8/8 PASS; E2E needs a Chromium — set `PW_CHROMIUM_PATH` if not at `/opt/pw-browsers/chromium`)
4. Read this file, then `docs/reports/OVERNIGHT_FOUNDATION_REPORT.md` §4–5 for open decisions and risks.
5. Repository state overrides this document if they disagree.

## Implemented (by layer)
| Layer | Path | Notes |
|---|---|---|
| Pure domain — battle | `src/game/domain/battle/` | v0.2: config, outcome, defend, party TP, tactics (damage/heal/confuse/inspire/taunt), formations, traits, Smart/Repeat/All-Attack, auto battle. v0.1 numbers preserved by golden tests |
| Pure domain — world | `src/game/domain/world/` | grid collision, budgeted A*, tap-to-move, guard/patrol/chase/return, encounter + grace |
| Pure domain — save | `src/game/domain/save/` | SaveGame v1 types, migration chain, battle checkpoint snapshot/restore |
| Pure domain — progress | `src/game/domain/progress/` | conditions/effects/triggers, quest cascade, one-shot events |
| Schemas / content | `src/game/schemas/`, `src/game/content/registry.ts`, `src/content/**` | Zod schemas + reference validation for 12 collections + ko locale |
| Adapters | `src/game/battle/`, `src/game/progress/`, `src/game/save/` | content→domain, BattleSession, applyBattleResult, createNewGame |
| Persistence | `src/game/persistence/` | `SaveRepository` port, Dexie (IndexedDB) + Memory adapters, validated encode/decode |
| Runtime bridge | `src/game/runtime/` | typed `GameBridge`, lazy `GameController` |
| Phaser | `src/game/phaser/` | Boot/Preload/World/Battle scenes, procedural placeholder visuals only |
| React | `src/app/` | world shell, encounter sheet, virtual d-pad, Smart Command battle UI, `useGame` autosave |
| PWA | `vite.config.ts`, `public/` | app-shell precache only; saves in IndexedDB |

## Validation commands
- `npm run verify:foundation` — typecheck, content validation, compiled-domain smoke, vitest, golden subset, architecture boundaries, build, Playwright Chromium 360/390/412
- `npm run check` — same without E2E
- `npm run validate:content`, `npm test`, `npm run test:domain`, `npm run test:e2e`, `npm run build`
- `npm run sim:encounters` — informational balance probe (not a gate)
- Golden update only when intentional: `UPDATE_GOLDEN=1 npx vitest run tests/domain/battle-golden.test.ts`

## Verification (observed at `4268d94`)
### PASS
- typecheck; content validation (21 files); domain smoke 4/4; vitest 69/69 (12 files); golden 7/7; architecture boundaries 2/2; build; Playwright Chromium E2E 18/18 (6 specs × 360/390/412)
### NOT_RUN
- Lint (not configured); Playwright WebKit (not installed); real Android Chrome / iPhone Safari; PWA install on device; 60 FPS measurement; GitHub Actions (disabled by ADR-004)

## Product Decisions
- BD-01 defeat penalty: **RESOLVED / APPROVED** by `docs/decisions/DEC-002-DEFEAT-RECOVERY.md`. Required implementation: return to most recent safe checkpoint, restore active-party generals to 30% max troops, no gold/XP loss, encounter remains active unless story logic changes it.

## BLOCKED_DECISION (neutral seams remain)
- BD-02 level-up curve — xp accumulates only
- BD-03 retreat rule — `src/game/battle/session.ts#retreat`

## Next Task (recommended order)
1. Human review of PR #2; decide BD-01..03.
2. Location travel + NPC interaction UI: wire `ENTER_LOCATION` / `TALK_NPC` triggers (engine and data already exist), per-location field maps.
3. Rest/recovery UI for `services` / `servicesWhenOwned` (`REST_PARTY` effect exists).
4. Formation selection UI (unlocked formations already persisted; `save.party.formationId` validated).
5. Boss telegraph + enemy tactic AI (battle core v0.3), then re-run `npm run sim:encounters`.
6. Real-device QA (Android Chrome, iPhone Safari, installed PWA) — required by PRD §16.

## Content review queue (`PROVISIONAL_CONTENT_REVIEW_REQUIRED`)
`EVT_20_RECRUIT_JIAN_YONG`, `NPC_JIAN_YONG`, `GEN_FOREST_RECLUSE` (original fictional optional recruit), `EVT_31_OPTIONAL_RECRUIT`, `NPC_FOREST_RECLUSE`, `LOC_FOREST_SIDE_PATH`, `ENC_NORTH_GATE_BOSS`, `GEN_YT_GATE_COMMANDER`, `GEN_YT_GATE_CHAMPION`, `REG_ZHUO_NORTH`, `LOC_NORTH_ROAD`.

## REQUIRED_CONTEXT
- `AGENTS.md`, `docs/ai-dev/AI_OS_BINDING.md`, `docs/product/PRD.md`, `docs/decisions/DECISION_INDEX.md`, `docs/specs/TECHNICAL_ARCHITECTURE.md`, this Handoff, `docs/reports/OVERNIGHT_FOUNDATION_REPORT.md`

## ON_DEMAND_CONTEXT
- `docs/specs/COMBAT.md`, `CHARACTER.md`, `WORLD.md`, `MOBILE_BATTLE_UX.md`, `GAME_DATA_SCHEMA.md`, `VERTICAL_SLICE.md`
- `docs/ai-dev/OVERNIGHT_TASK_GRAPH.md` (completed graph; historical)

## Human Gate
- Merge PR #2 → `implementation/bootstrap`: REQUIRED
- Merge PR #1 → `main`: REQUIRED
- Production deploy / public release / tag: REQUIRED
- Product decisions BD-02..03: REQUIRED
- BD-01 code implementation/verification: REQUIRED NEXT WORK (decision already approved)
