# SESSION HANDOFF — Field Presentation v1

## Current State
- Repository: `nanpsw-eng/three-kingdoms-web` (PUBLIC)
- Default branch: `main`
- Integration branch: `implementation/bootstrap@5982fe5abcd0aa6f96aa6b048dfa814c9aa84551`
- Working branch: `feature/field-presentation-v1`
- Draft PR: **#6** → `implementation/bootstrap`
- Verified code HEAD: `3f85f33ecd21c7e790b064ce335f47ef7d6f4e2c`
- Verification: Actions `36974579560` — **SUCCESS**
- Current Gate: `FIELD_PRESENTATION_V1_GREEN / MERGE_HUMAN_GATE`
- Detailed evidence: `docs/reports/FIELD_PRESENTATION_V1_REPORT.md`

## AI-OS / execution
- AI-OS: `v0.4.4@64b5115a698cc6a94cd8df80abb2ee7109010764`
- Risk: `RISK_MEDIUM`
- CI: validation-only GitHub Actions per ADR-004.
- No deploy/release/tag automation is authorized.

## Integrated baseline
- Foundation N0–N11 integrated.
- Battle Strategy v1 integrated.
- World Interaction v1 integrated.
- Secret Area v1 integrated by PR #5 at `implementation/bootstrap@5982fe5...`.
- Do not redo these baselines.

## Completed in Field Presentation v1
1. Added framework-neutral `FieldPresentation` registry.
2. South Plain migrated into the registry.
3. Added Baishui Forest procedural field.
4. Added visible `ENC_BAISHUI_FOREST_AMBUSH` patrol.
5. Generalized WorldScene to switch fields by Save Location.
6. Same-location discovery/defeat updates do not rebuild the field.
7. Added typed `set-field-location` bridge command.
8. React syncs current Save location/discovery/defeat metadata into Phaser.
9. Forest side-path marker is invisible before discovery and visible after search.
10. Existing South Plain Tap-to-Move/Visible Encounter remains green.
11. Mobile field/secret journey verified at 360/390/412.

## Verification
Actions `36974579560`:
- typecheck PASS
- content validation PASS
- domain smoke 4/4
- Vitest **81/81**
- golden **7/7**
- architecture boundaries **2/2**
- build/PWA PASS
- Chromium E2E **27/27**

NOT_RUN:
- real Android Chrome
- real iPhone Safari
- installed PWA real device
- representative-device FPS

## Known limitations
- Real Phaser fields: South Plain + Baishui Forest only.
- Outpost / North Gate / Side Path remain React Location Surfaces.
- Travel between locations still primarily uses the Location Sheet.
- SHOP is not implemented.
- BD-02 and BD-03 remain open.

## Next Task after merge
Recommended: **Field Presentation v2**
1. Yellow Turban Outpost field.
2. North Gate field.
3. visible field exits/interact hotspots.
4. keep mobile Location Sheet as navigation/QoL fallback.
5. real-device QA after the Vertical Slice physical route is represented.

## REQUIRED_CONTEXT
- `AGENTS.md`
- `docs/ai-dev/AI_OS_BINDING.md`
- `docs/product/PRD.md`
- `docs/specs/WORLD.md`
- `docs/reports/SECRET_AREA_V1_REPORT.md`
- `docs/reports/FIELD_PRESENTATION_V1_REPORT.md`
- this Handoff

## Human Gates
- Merge PR #6 → `implementation/bootstrap`: REQUIRED.
- Merge PR #1 → `main`: REQUIRED and separate.
- production deploy/release/tag: REQUIRED.
