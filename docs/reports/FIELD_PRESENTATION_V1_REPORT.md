# FIELD PRESENTATION v1 REPORT — 2026-10-02

## 0. Summary

| Item | Result |
|---|---|
| Repository | `nanpsw-eng/three-kingdoms-web` |
| Base | `implementation/bootstrap@5982fe5abcd0aa6f96aa6b048dfa814c9aa84551` |
| Feature branch | `feature/field-presentation-v1` |
| Verified code HEAD | `3f85f33ecd21c7e790b064ce335f47ef7d6f4e2c` |
| Draft PR | #6 → `implementation/bootstrap` |
| GitHub Actions | `36974579560` — **SUCCESS** |
| Merge | **NOT_PERFORMED — Human Gate** |

Field Presentation v1 removes the South-Plain-only rendering assumption and introduces a location-driven Phaser field presentation layer. The first added field is Baishui Forest.

## 1. Implemented

### Location-driven field registry
New:
- `src/game/world/fieldPresentations.ts`

Field definitions are framework-neutral data:
- Location ID
- FieldMap
- visible enemy specs
- optional discovery-controlled visual markers

Current real Phaser fields:
- `LOC_SOUTH_PLAIN`
- `LOC_BAISHUI_FOREST`

### WorldScene generalization
`WorldScene` now:
- renders a selected FieldPresentation;
- rebuilds only when the Save Location changes to another presented field;
- keeps the same WorldState when only discovery/defeat metadata changes;
- updates defeated-enemy visibility from Save;
- updates secret markers from discovered locations;
- keeps Tap-to-Move, d-pad, chase and encounter rules in the existing pure world domain.

### Baishui Forest
A new procedural/original placeholder field was added:
- dense-tree/tall-grass forest layout;
- one visible Yellow Turban ambush patrol;
- encounter: `ENC_BAISHUI_FOREST_AMBUSH`;
- secret marker position for `LOC_FOREST_SIDE_PATH`.

No external/original-game visual assets are used.

### Save → Phaser synchronization
Typed bridge command:
`set-field-location`

Payload:
- current location ID;
- discovered Location IDs;
- defeated Encounter IDs.

React emits this from Save state while the World scene is active.

### Secret path visual reveal
Before discovery:
- secret marker exists but is invisible.

After `SEARCH_LOCATION` discovers `LOC_FOREST_SIDE_PATH`:
- the same-location sync updates metadata only;
- player/world position is not reset;
- secret-path marker becomes visible immediately.

## 2. Verification

Actions `36974579560` on code HEAD `3f85f33ecd21c7e790b064ce335f47ef7d6f4e2c`:

- typecheck: PASS
- content validation: PASS
- domain smoke: PASS 4/4
- Vitest: **81/81 PASS**
- battle golden: **7/7 PASS**
- architecture boundaries: **2/2 PASS**
- build/PWA: PASS
- Chromium E2E: **27/27 PASS**

Field-specific E2E passed at:
- 360px
- 390px
- 412px

Covered behavior:
1. Baishui Forest Save location loads `FIELD_BAISHUI_FOREST_PROTO`.
2. Forest ambush exists as a visible field enemy.
3. Forest side-path marker starts hidden.
4. Search discovery updates Save.
5. Marker becomes visible without a field reload/player reset.
6. Existing secret-path travel and recruit journey continues to pass.

## 3. Architecture outcome

Before:
`WorldScene = South Plain fixture`

After:
`Save Location → FieldPresentation registry → WorldScene renderer`

This is now extensible to:
- Yellow Turban Outpost
- North Gate
- North Road
- future forests/dungeons/battlefields

without adding location-specific branches to the pure world engine.

## 4. Scope boundary / remaining risks

1. Outpost and North Gate remain React Location Surfaces.
2. Secret Side Path itself remains a React Location Surface.
3. The forest field does not yet provide an in-canvas exit/interact hotspot; Location Sheet remains the travel/navigation surface.
4. Real Android Chrome / iPhone Safari / installed PWA: NOT_RUN.
5. Representative-device FPS: NOT_RUN.
6. BD-02 level progression: OPEN.
7. BD-03 retreat policy: OPEN.
8. Optional recruit/dialogue content remains PROVISIONAL_CONTENT_REVIEW_REQUIRED.

## 5. Recommended next work

**Field Presentation v2**
1. Yellow Turban Outpost field + visible garrison.
2. North Gate field + boss gate presentation.
3. field exit / interaction hotspots so traversal can increasingly happen inside Phaser rather than only through the Location Sheet.
4. keep Location Sheet as mobile navigation/QoL fallback.
5. then evaluate whether Side Path needs its own tiny field or can remain a location surface.

## 6. Gate

- Feature implementation: PASS
- Automated validation: PASS
- Real-device acceptance: NOT_RUN
- Merge PR #6 → `implementation/bootstrap`: **HUMAN APPROVAL REQUIRED**
