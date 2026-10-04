# SESSION HANDOFF — Equipment / Shop v1

## Current State
- Repository: `nanpsw-eng/three-kingdoms-web` (PUBLIC)
- Default branch: `main`
- Integration branch: `implementation/bootstrap@ea02f9354cd4c01926be3249a00b589c70d50a08`
- RC QA PR #10: **MERGED** (2026-10-04, human-approved)
- Working branch: `ccr-47ddf3a9-qsyimg` (based on post-PR10 bootstrap)
- PR for this branch: **NOT_OPENED**
- Current Gate: `LOCAL_GATE_GREEN / DEC-005_HUMAN_APPROVAL / PR_HUMAN_GATE`
- Detailed evidence: `docs/reports/EQUIPMENT_SHOP_V1_REPORT.md`

## Integrated baseline
PRs #2 through #10 are integrated into `implementation/bootstrap`.
DEC-002 / DEC-003 / DEC-004 are approved and implemented.

## This branch — Equipment / Shop v1 (FR-008)
- Equipment + Shop content schemas, 11 items, 2 shops (Zhuo Town, Baishui Village).
- Aptitude-gated weapons; S/A/B/C weapon attack multipliers; armor defense; accessory stat bonuses.
- Pure buy / equip / unequip transitions; save version stays 1.
- Shop sheet (location) and party/equipment sheet (`부대`), gold badge.
- DEC-005 written as **PROPOSED**.
- Fix: cold-import timeout in `tests/runtime-bridge.test.ts`.

Local evidence:
- typecheck/content/domain/build PASS
- Vitest 103/103
- Chromium E2E 39/39 (Critical Journey unchanged)
- WebKit: NOT_RUN locally (not installed in container)

## Remaining NOT_RUN
- WebKit run of `equipment-shop.spec.ts` (CI)
- physical Android Chrome
- physical iPhone Safari
- installed PWA on physical device
- representative-device FPS/memory/thermal
- human playtime/comprehension/fun, including gear value and prices
- assistive-technology accessibility

## Next Gate
1. Human review of DEC-005 open questions (aptitude multipliers, selling, optional vs. required purchase).
2. Open PR `ccr-47ddf3a9-qsyimg → implementation/bootstrap`; confirm Actions (Chromium + WebKit).
3. Human approval for that merge.
4. Real-device / human playtest acceptance, then reassess PR #1 (`implementation/bootstrap → main`).

## REQUIRED_CONTEXT
- `AGENTS.md`
- `docs/ai-dev/AI_OS_BINDING.md`
- `docs/product/PRD.md`
- `docs/decisions/DEC-005-EQUIPMENT-SHOP.md`
- `docs/reports/EQUIPMENT_SHOP_V1_REPORT.md`
- this Handoff

## Human Gates
- DEC-005 approval: REQUIRED.
- Equipment/Shop PR merge: REQUIRED.
- PR #1 → main: REQUIRED and separate.
- production deploy/release/tag: REQUIRED.
