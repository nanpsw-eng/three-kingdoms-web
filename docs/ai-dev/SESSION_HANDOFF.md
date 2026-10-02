# SESSION HANDOFF — Secret Area v1

## Current State
- Repository: `nanpsw-eng/three-kingdoms-web` (PUBLIC)
- Default branch: `main`
- Integration branch: `implementation/bootstrap@853194fca2607bf06e5a959b587b988aef99cef7`
- Working branch: `feature/secret-area-v1`
- Draft PR: **#5** → `implementation/bootstrap`
- Verified code HEAD: `e8c7bb6e85c14e5a9979bc91fde7d2fa68fa142b`
- Verification: Actions `36964276017` — **SUCCESS**
- Current Gate: `SECRET_AREA_V1_GREEN / MERGE_HUMAN_GATE`
- Detailed evidence: `docs/reports/SECRET_AREA_V1_REPORT.md`

## AI-OS / execution
- AI-OS: `v0.4.4@64b5115a698cc6a94cd8df80abb2ee7109010764`
- Risk: `RISK_MEDIUM`
- CI: validation-only GitHub Actions per ADR-004.
- No deploy/release/tag automation is authorized.

## Integrated baseline
- Foundation N0–N11 integrated.
- Battle Strategy v1 integrated.
- World Interaction v1 integrated by PR #4 at `implementation/bootstrap@853194f...`.
- Do not redo these baselines.

## Completed in Secret Area v1
1. Generic `SEARCH_LOCATION` ProgressTrigger.
2. Zod/registry validation for search trigger location references.
3. Content-driven `EVT_29_SEARCH_FOREST_SIDE_PATH`.
4. Search is gated by Baishui visit + Jian Yong membership.
5. `canSearchCurrentLocation()` / `searchCurrentLocation()` adapter functions.
6. Mobile Location Sheet exposes `주변 수색` only while an eligible search event exists.
7. Search discovers `LOC_FOREST_SIDE_PATH`, updates Save and immediately reveals travel.
8. Side-path entry fires the existing discovery flag event.
9. Forest recluse dialogue/recruitment works through existing TALK_NPC progression.
10. End-to-end route verified from scout battle through optional recruit.

## Verification
Actions `36964276017` on `e8c7bb6e...`:
- typecheck PASS
- content validation PASS
- domain smoke 4/4
- Vitest **78/78**
- golden **7/7**
- architecture boundaries **2/2**
- build/PWA PASS
- Chromium E2E **27/27**
- secret journey: PASS at 360 / 390 / 412

NOT_RUN:
- real Android Chrome
- real iPhone Safari
- installed PWA real device
- representative-device FPS

## Known limitations
- Only South Plain is a real Phaser field.
- Baishui Forest / side path / Outpost / North Gate still use React location surfaces.
- Optional recruit and some dialogue remain `PROVISIONAL_CONTENT_REVIEW_REQUIRED`.
- SHOP is not implemented.
- BD-02 and BD-03 remain open.

## Next Task after merge
Recommended: **Field Presentation v1**
1. make WorldScene location-driven rather than South-Plain-only;
2. Baishui Forest field first;
3. visually reveal/open secret side path based on Save discovery;
4. Outpost and North Gate next;
5. preserve React UI / Phaser rendering / Pure TS rule boundaries.

## REQUIRED_CONTEXT
- `AGENTS.md`
- `docs/ai-dev/AI_OS_BINDING.md`
- `docs/product/PRD.md`
- `docs/specs/WORLD.md`
- `docs/reports/WORLD_INTERACTION_V1_REPORT.md`
- `docs/reports/SECRET_AREA_V1_REPORT.md`
- this Handoff

## Human Gates
- Merge PR #5 → `implementation/bootstrap`: REQUIRED.
- Merge PR #1 → `main`: REQUIRED and separate.
- production deploy/release/tag: REQUIRED.
