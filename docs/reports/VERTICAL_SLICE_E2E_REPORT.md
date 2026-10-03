# VERTICAL SLICE E2E REPORT — 2026-10-03

## 0. Summary

| Item | Result |
|---|---|
| Repository | `nanpsw-eng/three-kingdoms-web` |
| Integration base | `implementation/bootstrap@8a22e7dc6ef53aae6fd3770e27553349500ad3ac` |
| Feature branch | `feature/vertical-slice-e2e` |
| Verified code HEAD | `e19fab1d2fc17eefea422dbf330325755403cd61` |
| Draft PR | #9 → `implementation/bootstrap` |
| GitHub Actions | `37117075808` — **SUCCESS** |
| Merge | **NOT_PERFORMED — Human Gate** |

This PR adds a consolidated browser Critical Journey that keeps one real autosaved game from the prologue through North Gate capture.

## 1. Critical Journey

Automated path:

`Zhuo Town → South Plain Scout → Baishui Village → Jian Yong → Baishui Forest → Search Secret Path → Forest Recluse → Yellow Turban Outpost → North Gate Boss → Capture`

The test uses:
- real React controls;
- real Phaser Tap-to-Move fields;
- real visible encounters;
- real BattleSession + Auto Battle;
- real progression events;
- real Dexie/IndexedDB autosave.

It does **not** inject or mutate Save state directly.

## 2. End-state evidence

Persisted `auto` Save is read from IndexedDB only after the journey completes.

Verified:
- defeated encounters include South Plain Scout, Outpost Garrison, North Gate Boss;
- Outpost owner = PLAYER;
- North Gate owner = PLAYER;
- `FLAG_OUTPOST_CAPTURED = true`;
- `FLAG_NORTH_GATE_CAPTURED = true`;
- `FLAG_OPTIONAL_RECRUIT_JOINED = true`;
- `REG_ZHUO_NORTH` unlocked;
- main quest = COMPLETED / step 5;
- final location = North Gate;
- final gold = **610**.

Progression:
- Liu Bei: **Lv5 / 50 XP**, knows Inspire;
- Guan Yu: **Lv5 / 50 XP**;
- Zhang Fei: **Lv5 / 50 XP**;
- Jian Yong: **Lv5 / 70 XP**;
- Forest Recluse: **Lv6 / 10 XP**, knows Confuse.

These values match the approved BD-02 current-level XP model for the tested route without the optional South Plain Riders battle.

## 3. Persistence

After final capture:
1. autosave reaches `ready`;
2. page reloads;
3. Save reloads from IndexedDB;
4. current location remains North Gate;
5. completed main-quest objective remains visible.

This verifies the full journey across a real persistence boundary.

## 4. Verification

GitHub Actions `37117075808` on code HEAD `e19fab1d2fc17eefea422dbf330325755403cd61`:

- typecheck: PASS
- content validation: PASS
- domain smoke: PASS 4/4
- Vitest: **90/90 PASS**
- battle golden: **7/7 PASS**
- architecture boundaries: **2/2 PASS**
- build/PWA: PASS
- Chromium responsive E2E: **33/33 PASS**

Critical Journey itself:
- 360px: PASS — 40.8s automation time
- 390px: PASS — 42.2s automation time
- 412px: PASS — 44.4s automation time

Automation duration is **not** evidence for the PRD's 20–30 minute human playtime target.

## 5. What this gate establishes

Engineering evidence now supports:
- one continuous Vertical Slice can be completed end to end;
- world, battle, recruitment, secret discovery, conquest, XP/level progression and persistence interoperate;
- BD-02 level progression behaves as intended on the main route;
- BD-03 does not block boss progression and remains separately unit-covered;
- the final Save survives reload.

## 6. Still NOT validated

- human playtime / pacing at 20–30 minutes;
- perceived fun, clarity and strategic depth;
- real Android Chrome;
- real iPhone Safari;
- installed-PWA behavior on physical devices;
- representative-device FPS / memory / thermal behavior;
- accessibility with assistive technology;
- SHOP/equipment loop.

Chromium responsive emulation is not equivalent to Android/iPhone real-device acceptance.

## 7. Recommended next gate

After PR #9 integration:
1. real Android Chrome smoke/critical journey;
2. real iPhone Safari smoke/critical journey;
3. installed-PWA save/resume test;
4. short human playtest for comprehension and pacing;
5. then decide whether `implementation/bootstrap` is ready to merge through PR #1 to `main`.

## 8. Gate

- Consolidated Vertical Slice E2E: **PASS**
- Automated engineering gate: **PASS**
- Real-device acceptance: **NOT_RUN**
- Human playtest: **NOT_RUN**
- Merge PR #9 → `implementation/bootstrap`: **HUMAN APPROVAL REQUIRED**
