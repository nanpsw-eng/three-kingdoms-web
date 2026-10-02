# SECRET AREA v1 REPORT — 2026-10-02

## 0. Summary

| Item | Result |
|---|---|
| Repository | `nanpsw-eng/three-kingdoms-web` |
| Base | `implementation/bootstrap@853194fca2607bf06e5a959b587b988aef99cef7` |
| Feature branch | `feature/secret-area-v1` |
| Verified code HEAD | `e8c7bb6e85c14e5a9979bc91fde7d2fa68fa142b` |
| Draft PR | #5 → `implementation/bootstrap` |
| GitHub Actions | `36964276017` — **SUCCESS** |
| Merge | **NOT_PERFORMED — Human Gate** |

Secret Area v1 closes the missing exploration loop from World Interaction v1:
`백수림 수색 → 숨겨진 샛길 발견 → 이동 → 숲의 은자 대화 → Optional Recruit`.

## 1. Implemented

### Generic SEARCH_LOCATION trigger
The progression system now supports:
`SEARCH_LOCATION { locationId }`

The trigger is:
- represented in the framework-free domain type;
- validated by Zod content schema;
- reference-checked by the content registry;
- dispatched through the existing pure progression engine.

The engine contains no Baishui-specific branch.

### Data-driven forest discovery
`EVT_29_SEARCH_FOREST_SIDE_PATH` owns the Vertical Slice discovery rule.

Conditions:
- Baishui has been visited;
- Jian Yong is already in the party/reserve roster.

Effect:
- discover `LOC_FOREST_SIDE_PATH`.

The event is one-shot by the existing event default, so the search action disappears after successful discovery.

### World interaction adapter
New adapter capabilities:
- `canSearchCurrentLocation()`
- `searchCurrentLocation()`

The adapter evaluates currently eligible SEARCH_LOCATION events and reports newly discovered location IDs after dispatch.

### Mobile UX
At a location with an eligible Search event:
- Location Sheet shows **주변 수색**.
- Search updates Save state through the same autosave commit flow.
- Discovery feedback: **나무 사이로 이어지는 숨겨진 샛길을 발견했습니다.**
- The previously hidden `이동: 숲속 샛길` button appears immediately.

### Optional recruit flow
After entering the discovered side path:
- existing `ENTER_LOCATION` event sets `FLAG_FOREST_SIDE_PATH_FOUND`;
- `NPC_FOREST_RECLUSE` becomes accessible at that location;
- talking fires the existing optional recruitment event;
- the recruit joins the active party when a slot is available.

Content remains `PROVISIONAL_CONTENT_REVIEW_REQUIRED`.

## 2. Verification

GitHub Actions run `36964276017` on code HEAD `e8c7bb6e85c14e5a9979bc91fde7d2fa68fa142b`:

- typecheck: PASS
- content validation: PASS
- domain smoke: PASS 4/4
- Vitest: **78/78 PASS**
- battle golden: **7/7 PASS**
- architecture boundaries: **2/2 PASS**
- build/PWA: PASS
- Chromium E2E: **27/27 PASS**

Secret full-journey E2E passed independently at all three mobile widths:
- 360px: PASS
- 390px: PASS
- 412px: PASS

The E2E performs:
1. Zhuo -> South Plain;
2. scout battle victory;
3. Baishui;
4. Jian Yong recruitment;
5. Baishui Forest;
6. secret search;
7. side-path discovery;
8. side-path travel;
9. forest recluse dialogue/recruitment.

Real Android Chrome / iPhone Safari / installed PWA remain **NOT_RUN**.

## 3. Failure found and resolved

First E2E run failed on all widths after Jian Yong dialogue.

Root cause:
- closing the NPC dialogue correctly returned the player to the already-open Location Sheet;
- the test incorrectly tried to tap the underlying global `지도` button, which was blocked by the sheet.

Resolution:
- test now follows the actual UX: dialogue closes -> existing Location Sheet -> `이동: 백수림`.
- no game logic change was required.
- stable existing scout helper is reused to avoid camera-follow tap precision regressions.

## 4. Design implications

The exploration reward loop is now observable:
`정보/동료 확보 → 수색 가능 → 숨겨진 길 발견 → 선택 장수 영입`.

Important rule:
- secrets are not listed by default;
- discovery is explicit player interaction;
- discovery rules live in content events;
- the world adapter/React layer does not hard-code specific secret destinations.

This pattern can be reused for:
- hidden caves;
- abandoned shrines;
- alternate mountain routes;
- secret NPC camps;
- optional treasure sites.

## 5. Deferred scope

1. Dedicated Phaser field for Baishui Forest.
2. Dedicated field/fort presentation for Yellow Turban Outpost.
3. Dedicated North Gate field presentation.
4. Historical/content review of the optional recruit and provisional dialogue.
5. SHOP/equipment flow.
6. BD-02 XP/level curve.
7. BD-03 retreat policy.
8. Real-device mobile/PWA acceptance.

## 6. Recommended next work

**Field Presentation v1**
1. generalize WorldScene from South-Plain-only visual fixture to location-driven field presentation;
2. implement Baishui Forest first;
3. represent secret-path discovery visually in the Forest field;
4. then Outpost / North Gate;
5. keep world rules/data independent from Phaser maps.

## 7. Gate

- Feature implementation: **PASS**
- Automated validation: **PASS**
- Real-device acceptance: **NOT_RUN**
- Merge PR #5 → `implementation/bootstrap`: **HUMAN APPROVAL REQUIRED**
