# SESSION HANDOFF — Field Presentation v2

## Current State
- Repository: `nanpsw-eng/three-kingdoms-web` (PUBLIC)
- Default branch: `main`
- Integration branch: `implementation/bootstrap@825e0348a7ed8a57ff3aacc24a2e032ed0e1789d`
- Working branch: `feature/field-presentation-v2`
- Draft PR: **#7** → `implementation/bootstrap`
- Verified code HEAD: `750fcf0a8240c177cdf912d4a35cc27b6d315165`
- Verification: Actions `36983962850` — **SUCCESS**
- Current Gate: `FIELD_PRESENTATION_V2_GREEN / MERGE_HUMAN_GATE`
- Detailed evidence: `docs/reports/FIELD_PRESENTATION_V2_REPORT.md`

## Integrated baseline
- Foundation N0–N11 integrated.
- Battle Strategy v1 integrated.
- World Interaction v1 integrated.
- Secret Area v1 integrated.
- Field Presentation v1 integrated by PR #6 at `implementation/bootstrap@825e0348...`.

## Completed
1. Outpost Phaser field.
2. Visible Outpost garrison.
3. North Gate Phaser field.
4. Visible North Gate boss.
5. Data-driven field exit hotspots.
6. Hotspot gating by `availableConnections()`.
7. Runtime hotspot-proximity event.
8. React contextual field-travel action.
9. Save mutation remains in `enterLocation()`.
10. World pauses while Location/NPC sheets are open.
11. Outpost field travel verified at 360/390/412.
12. Locked North Gate exit verified hidden before progression.

## Verification
Actions `36983962850`:
- typecheck PASS
- content validation PASS
- domain smoke 4/4
- Vitest **82/82**
- golden **7/7**
- architecture boundaries **2/2**
- build/PWA PASS
- Chromium E2E **30/30**

NOT_RUN:
- real Android Chrome
- real iPhone Safari
- installed PWA real device
- representative-device FPS

## Known limitations
- Full E2E Outpost victory → North Gate is not yet dedicated.
- Town / Village / Side Path / North Road remain React Location Surfaces.
- Field exits use proximity + React action.
- SHOP is not implemented.
- BD-02 and BD-03 remain open.

## Next Task after merge
Recommended:
1. BD-02 level progression decision + implementation.
2. BD-03 retreat decision + implementation.
3. full Vertical Slice E2E through North Gate capture.
4. real-device QA.

## REQUIRED_CONTEXT
- `AGENTS.md`
- `docs/ai-dev/AI_OS_BINDING.md`
- `docs/product/PRD.md`
- `docs/decisions/DECISION_INDEX.md`
- `docs/specs/WORLD.md`
- `docs/specs/CHARACTER.md`
- `docs/specs/COMBAT.md`
- `docs/reports/FIELD_PRESENTATION_V2_REPORT.md`
- this Handoff

## Human Gates
- Merge PR #7 → `implementation/bootstrap`: REQUIRED.
- Merge PR #1 → `main`: REQUIRED and separate.
- production deploy/release/tag: REQUIRED.
