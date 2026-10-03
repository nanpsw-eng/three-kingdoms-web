# FIELD PRESENTATION v2 REPORT — 2026-10-02

## 0. Summary

| Item | Result |
|---|---|
| Repository | `nanpsw-eng/three-kingdoms-web` |
| Base | `implementation/bootstrap@825e0348a7ed8a57ff3aacc24a2e032ed0e1789d` |
| Feature branch | `feature/field-presentation-v2` |
| Verified code HEAD | `750fcf0a8240c177cdf912d4a35cc27b6d315165` |
| Draft PR | #7 → `implementation/bootstrap` |
| GitHub Actions | `36983962850` — **SUCCESS** |
| Merge | **NOT_PERFORMED — Human Gate** |

Field Presentation v2 extends the location-driven Phaser renderer to the Yellow Turban Outpost and North Gate, and adds data-driven field-exit hotspots that move more traversal into the field.

## 1. Implemented

### New Phaser fields
FieldPresentation now covers:
- `LOC_SOUTH_PLAIN`
- `LOC_BAISHUI_FOREST`
- `LOC_YT_OUTPOST`
- `LOC_NORTH_GATE`

New procedural/original fields:
- `FIELD_YT_OUTPOST_PROTO` with visible `ENC_YT_OUTPOST_GARRISON`
- `FIELD_NORTH_GATE_PROTO` with visible `ENC_NORTH_GATE_BOSS`

### Field exit hotspots
`FieldPresentation` supports:
- hotspot ID
- destination Location ID
- world-space position
- label
- proximity radius

Hotspots are presentation data only.

### Travel authority remains outside Phaser
React calculates legal destinations through `availableConnections(save, registry)` and sends only those IDs to Phaser.

WorldScene:
- displays only currently legal exit hotspots;
- detects proximity;
- emits `field-hotspot-changed`;
- never mutates Save or authorizes travel.

React:
- shows a touch-accessible `필드 이동: <장소>` action;
- executes travel through existing `enterLocation()`.

### Progression gating is visible
At the Outpost:
- Forest return exit is visible.
- North Gate exit remains hidden before Outpost victory discovers it.

At North Gate:
- Outpost return exit is defined.
- North Road exit stays subject to existing progression/region unlock rules.

### Menu safety
World simulation pauses while Location Sheet or NPC dialogue is open, preventing hidden background encounters during menu interaction.

## 2. Verification

Actions `36983962850` on code HEAD `750fcf0a8240c177cdf912d4a35cc27b6d315165`:

- typecheck: PASS
- content validation: PASS
- domain smoke: PASS 4/4
- Vitest: **82/82 PASS**
- battle golden: **7/7 PASS**
- architecture boundaries: **2/2 PASS**
- build/PWA: PASS
- Chromium E2E: **30/30 PASS**

Field-hotspot E2E passed at 360 / 390 / 412:
1. enter Baishui Forest;
2. walk safely to the Outpost exit;
3. contextual field-travel action appears;
4. enter Yellow Turban Outpost via field exit;
5. Phaser switches to `FIELD_YT_OUTPOST_PROTO`;
6. visible Outpost garrison exists;
7. Forest return exit is visible;
8. North Gate exit is hidden before progression unlock.

North Gate runtime fixture is unit-validated for:
- valid player/enemy/hotspot positions;
- `FIELD_NORTH_GATE_PROTO`;
- `ENC_NORTH_GATE_BOSS`;
- Outpost / North Road exit definitions.

A full browser Outpost-victory → North-Gate journey is deferred to the consolidated Vertical Slice E2E.

## 3. Architecture

`Save + Content → availableConnections → set-field-location → FieldPresentation → WorldScene → nearby hotspot → React → enterLocation`

Responsibilities:
- Domain: movement/AI/battle rules.
- World interaction adapter: travel legality and Save mutation.
- FieldPresentation: spatial/render fixture data.
- Phaser: rendering, input, proximity.
- React: accessible action UI.

## 4. Vertical Slice presentation status

| Location | Presentation |
|---|---|
| Zhuo Town | React Location Surface |
| South Plain | Phaser field |
| Baishui Village | React Location Surface |
| Baishui Forest | Phaser field |
| Forest Side Path | React Location Surface |
| Yellow Turban Outpost | **Phaser field** |
| North Gate | **Phaser field** |
| North Road | React/provisional |

## 5. Remaining risks / deferred

1. Full browser Outpost victory → North Gate field not yet a dedicated E2E.
2. Hotspots use proximity + React action, not direct canvas activation.
3. Town/Village/Side Path/North Road remain location surfaces.
4. Procedural visuals are prototype quality.
5. Real Android Chrome / iPhone Safari / installed PWA: NOT_RUN.
6. Representative-device FPS: NOT_RUN.
7. BD-02 XP/level curve: OPEN.
8. BD-03 retreat policy: OPEN.
9. SHOP/equipment loop: deferred.

## 6. Recommended next work

Before adding more map breadth:
1. resolve **BD-02 fixed-identity level progression**;
2. resolve **BD-03 retreat policy**;
3. implement both with regression tests;
4. add one full Vertical Slice E2E through North Gate capture;
5. then real-device QA.

## 7. Gate

- Feature implementation: PASS
- Automated validation: PASS
- Real-device acceptance: NOT_RUN
- Merge PR #7 → `implementation/bootstrap`: **HUMAN APPROVAL REQUIRED**
