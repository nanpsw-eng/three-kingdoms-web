# SESSION HANDOFF — Battle Strategy v1

## Current State
- Repository: `nanpsw-eng/three-kingdoms-web` (PUBLIC)
- Default branch: `main`
- Integration branch: `implementation/bootstrap@8dbfe6c702d0b809705fc480c9b210a4f70eeb7e`
- Working branch: `feature/battle-strategy-v1`
- Draft PR: **#3** → `implementation/bootstrap`
- Verified code HEAD: `06a75b4c1df35cb14ee84ccf1f35b3b4ef50f6be`
- Branch HEAD before final documentation sync: `f1b1980c9323d89d5c0120cc4855851eb4f0f7b4`
- Validation run: GitHub Actions `36941533216` — SUCCESS
- Current Gate: `BATTLE_STRATEGY_V1_GREEN / MERGE_HUMAN_GATE`
- Detailed evidence: `docs/reports/BATTLE_STRATEGY_V1_REPORT.md`

## AI-OS / execution
- AI-OS: `v0.4.4@64b5115a698cc6a94cd8df80abb2ee7109010764`
- Risk: `RISK_MEDIUM`
- CI: ADR-004 scoped validation-only GitHub Actions is active.
- No deploy/release/publish automation is authorized.

## Integrated baseline already present
Foundation N0–N11 from former PR #2 is integrated into `implementation/bootstrap`.
Do not redo foundation work.

## Completed in this feature
1. **DEC-002 / BD-01 implemented**
   - defeat -> safe checkpoint;
   - active party -> 30% max troops;
   - no gold/XP loss;
   - encounter remains active.
2. **Boss Telegraph**
   - data schema + reference validation;
   - North Gate turn-2 warning / turn-3 declared all-enemy tactic.
3. **Enemy tactic AI**
   - deterministic forced telegraph, heal/support/control/damage heuristics, attack fallback.
4. **Formation selection**
   - unlocked formations selectable in encounter sheet;
   - selected formation reaches BattleState.
5. **Battle UI**
   - accessible telegraph warning.
6. **Balance evidence**
   - Smart/Crane boss: 8.8 turns, 76% troop loss;
   - Jian Yong Confuse response: 7.3 turns, 54% loss;
   - Wedge Smart: 6.0 turns, 59% loss.

## Verification
PASS at code HEAD `06a75b4...`:
- typecheck
- content validation
- domain smoke 4/4
- Vitest 73/73
- golden 7/7
- architecture boundaries 2/2
- build/PWA
- Chromium E2E 18/18 at 360/390/412

NOT_RUN:
- real Android Chrome
- real iPhone Safari
- installed PWA on real devices
- representative-device FPS
- lint not configured
- Playwright WebKit

## Open product decisions
- BD-02 level-up curve / XP table / tactic unlock schedule.
- BD-03 retreat success/penalty.

## Residual design note
Universal defend and raw commander focus are currently inferior telegraph responses. Control/disruption and formation choice provide measurable value. Do not teach “always defend the telegraph” as the expected solution.
Smart-only still wins the current 50-seed probe, so human playtest remains required.

## Next Task after merge
Recommended:
1. Location transition + NPC interaction UI.
2. Rest/recovery services UI.
3. Multi-location Vertical Slice world route.
4. BD-02 decision + progression implementation.
5. BD-03 decision + retreat implementation.
6. real-device QA.

## REQUIRED_CONTEXT
- `AGENTS.md`
- `docs/ai-dev/AI_OS_BINDING.md`
- `docs/product/PRD.md`
- `docs/decisions/DECISION_INDEX.md`
- `docs/decisions/DEC-002-DEFEAT-RECOVERY.md`
- `docs/specs/TECHNICAL_ARCHITECTURE.md`
- `docs/specs/COMBAT.md`
- `docs/reports/BATTLE_STRATEGY_V1_REPORT.md`
- this Handoff

## Human Gates
- Merge PR #3 -> `implementation/bootstrap`: REQUIRED.
- PR #1 `implementation/bootstrap -> main`: REQUIRED and not part of this feature.
- production deploy/release/tag: REQUIRED.
- BD-02 / BD-03 product decisions: REQUIRED.
