# SESSION HANDOFF — Progression & Retreat v1

## Current State
- Repository: `nanpsw-eng/three-kingdoms-web` (PUBLIC)
- Default branch: `main`
- Integration branch: `implementation/bootstrap@5ad07befde0747ee6641688a795b42c70ddbe565`
- Working branch: `feature/progression-retreat-v1`
- Draft PR: **#8** → `implementation/bootstrap`
- Verified code HEAD: `f837a5bc031e0187af585d7fbaff9dee6cb850f5`
- Verification: Actions `36996258786` — **SUCCESS**
- Current Gate: `PROGRESSION_RETREAT_V1_GREEN / MERGE_HUMAN_GATE`
- Detailed evidence: `docs/reports/PROGRESSION_RETREAT_V1_REPORT.md`

## Integrated baseline
- Foundation N0–N11 integrated.
- Battle Strategy v1 integrated.
- World Interaction v1 integrated.
- Secret Area v1 integrated.
- Field Presentation v1/v2 integrated; PR #7 merge commit is `5ad07bef...`.

## Completed
1. Lv.1–30 player progression.
2. Current-level XP model.
3. XP curve `40 + 20 × level` (BALANCE_PROPOSED).
4. Participants 100% XP / reserves 50%.
5. Multi-level gains.
6. Sparse stat/tactic milestones in general content.
7. Effective combat stats derived from level milestones.
8. Liu Bei Lv4 Inspire unlock; Forest Recluse Lv5 Confuse unlock.
9. Level-up adds only troop-capacity delta.
10. Routed generals remain at 0 troops.
11. Save validation caps general level at 30.
12. Allowed retreat is deterministic 100%.
13. Boss encounters cannot allow retreat.
14. Retreat persists troops, gives no rewards and leaves encounter active.
15. World notice surfaces level/tactic unlock feedback.
16. Recruits starting above a tactic milestone receive all tactics earned up to their recruitment level.

## Verification
Actions `36996258786`:
- typecheck PASS
- content validation PASS
- domain smoke 4/4
- Vitest **90/90**
- battle golden **7/7**
- architecture boundaries **2/2**
- build/PWA PASS
- Chromium E2E **30/30**

## Decision state
- DEC-003: **APPROVED / IMPLEMENTED ON FEATURE**.
- DEC-004: **APPROVED / IMPLEMENTED ON FEATURE**.
- Merge approval for PR #8 remains required to establish both as the `implementation/bootstrap` integration baseline.

## Pacing
Main-route starter ends near Lv5; with optional South Plain Riders near Lv6. This is a first balance baseline, not final playtest validation.

## Known limitations
- full Vertical Slice browser journey through Outpost/North Gate capture is still pending;
- real Android/iPhone/PWA QA is NOT_RUN;
- representative-device FPS is NOT_RUN;
- XP/milestone tuning is balance-adjustable;
- SHOP/equipment loop remains unimplemented.

## Next Task after merge
1. consolidated Vertical Slice E2E through North Gate capture.
2. validate resulting level/tactic progression and pacing.
3. real-device QA.

## REQUIRED_CONTEXT
- `AGENTS.md`
- `docs/ai-dev/AI_OS_BINDING.md`
- `docs/product/PRD.md`
- `docs/decisions/DECISION_INDEX.md`
- `docs/decisions/DEC-003-LEVEL-PROGRESSION.md`
- `docs/decisions/DEC-004-RETREAT-POLICY.md`
- `docs/specs/CHARACTER.md`
- `docs/specs/COMBAT.md`
- `docs/reports/PROGRESSION_RETREAT_V1_REPORT.md`
- this Handoff

## Human Gates
- Merge PR #8 → `implementation/bootstrap`: REQUIRED.
- Merge PR #1 → `main`: REQUIRED and separate.
- production deploy/release/tag: REQUIRED.
