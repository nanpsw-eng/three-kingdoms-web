# WORLD INTERACTION v1 REPORT — 2026-10-02

## 0. Summary

| Item | Result |
|---|---|
| Repository | `nanpsw-eng/three-kingdoms-web` |
| Base | `implementation/bootstrap@b2b8c13141f8484f923919c84a7937a6cf73d0fa` |
| Feature branch | `feature/world-interaction-v1` |
| Code HEAD before report/handoff docs | `7fa662f04c3b8d74f8090d9a9a3f94b278cc30d3` |
| Draft PR | #4 → `implementation/bootstrap` |
| Merge | **NOT_PERFORMED — Human Gate** |

World Interaction v1 connects the existing world/progression data to a usable mobile loop without replacing the approved Phaser/React boundary.

## 1. Implemented

### World interaction adapter
New `src/game/world/interaction.ts` owns application-facing world interactions:
- adjacent location travel;
- region unlock checks;
- discovery-aware secret/gate visibility;
- current-location NPC lookup;
- `TALK_NPC` trigger dispatch;
- effective `REST / SAVE_POINT / SHOP` service resolution;
- rest/recovery;
- active local encounter lookup.

The pure progression engine remains unchanged and framework-free.

### Location travel
- Travel follows bidirectional `Location.connections`.
- Region unlocks are enforced.
- Undiscovered `SECRET` locations are hidden.
- Undiscovered `GATE` locations are hidden, preventing the North Gate from being reached before the Outpost progression event discovers it.
- Entering a location dispatches `ENTER_LOCATION`.
- Newly entered locations become discovered.
- Entering a location with `SAVE_POINT` updates `world.checkpointId`.

### NPC interaction
- NPCs are exposed only at their current location.
- Talking dispatches `TALK_NPC` through the existing progression engine.
- Jian Yong recruitment now additionally requires main quest step 2, so early travel to Baishui cannot bypass the scout objective.

### Rest/recovery
- `REST` is available only where the location service allows it.
- Rest uses the existing `REST_PARTY` progression effect.
- A REST location that is also a SAVE_POINT refreshes the recovery checkpoint.

### Mobile UI
- South Plain remains the real Phaser Tap-to-Move field.
- Town/village/forest/fort/gate use a React location surface over the paused Phaser field.
- Location sheet exposes:
  - NPCs;
  - available facilities;
  - local enemy encounters;
  - adjacent travel.
- Forest/Outpost/Gate battles can be initiated through the location sheet and reuse the existing BattleSession/BattleScreen pipeline.
- Current location and checkpoint are exposed as read-only DOM data attributes for E2E evidence.

## 2. Validation evidence

First complete PR validation on code HEAD `3507a1ea9c39a4e1e9dac01b4747b246ac54eced`:
- GitHub Actions run `36958594062`: **SUCCESS**
- typecheck: PASS
- content validation: PASS
- domain smoke: PASS 4/4
- Vitest: **77/77 PASS**
- battle golden: **7/7 PASS**
- architecture boundaries: **2/2 PASS**
- build/PWA: PASS
- Chromium E2E: **24/24 PASS** at 360 / 390 / 412 widths

After that green run, two small code-quality corrections were added:
1. undiscovered GATE travel is blocked;
2. encounter action text changed to the natural `전투: <이름>` form.

Those changes are covered by additional unit/E2E assertions. **The latest PR #4 GitHub Actions run is the final verification authority for the current PR head.**

## 3. Key behavior

### New-game route
`탁현 → 남부 평야 → 백수촌 → 백수림 → 황건 전초기지 → 북부 관문`

- 탁현 and 백수촌 become safe checkpoints because they provide SAVE_POINT.
- The South Plain retains Visible Encounter and Tap-to-Move.
- Other locations currently use location surfaces rather than pretending that the South Plain Phaser map is their real map.
- Outpost/North Gate battles use the same deterministic battle engine as field encounters.

### Quest order protection
Jian Yong cannot be recruited simply by walking to Baishui early.
The recruitment event requires:
- Baishui visited; and
- main quest at step 2.

### Story gate protection
North Gate is only listed after the Outpost victory event has discovered it.
North Road remains region-locked until North Gate capture unlocks `REG_ZHUO_NORTH`.

## 4. Deferred scope

1. **Secret discovery interaction** — `LOC_FOREST_SIDE_PATH` remains hidden until discovered, but the active player-facing “search/reveal secret path” action is not implemented yet.
2. **Per-location Phaser maps** — only South Plain is a full field. Other locations intentionally use reversible placeholder location surfaces.
3. **Shop UI** — service is visible as “준비 중” but purchasing remains out of scope.
4. **NPC dialogue content review** — provisional lines/history still require content review.
5. **Real-device QA** — Android Chrome, iPhone Safari, installed PWA remain NOT_RUN.
6. **BD-02 / BD-03** — level progression and retreat rules remain open product decisions.

## 5. Recommended next work

After integration:
1. Secret-area discovery interaction in Baishui Forest.
2. Per-location field presentation, beginning with Baishui Forest / Outpost / North Gate.
3. Shop/equipment flow only after the core travel/encounter loop is comfortable.
4. Resolve BD-02 and implement fixed-identity XP/level progression.
5. Resolve BD-03 retreat policy.
6. Real-device Vertical Slice QA.

## 6. Gate

- Feature implementation: IMPLEMENTED
- First full PR validation: PASS
- Latest-head validation: **check PR #4 latest GitHub Actions; it is authoritative**
- Merge to `implementation/bootstrap`: **HUMAN APPROVAL REQUIRED**
