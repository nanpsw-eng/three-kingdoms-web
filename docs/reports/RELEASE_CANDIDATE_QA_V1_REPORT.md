# RELEASE CANDIDATE QA v1 REPORT — 2026-10-03

## 0. Summary

| Item | Result |
|---|---|
| Repository | `nanpsw-eng/three-kingdoms-web` |
| Stack base | `feature/vertical-slice-e2e` / PR #9 |
| Working branch | `feature/release-candidate-qa-v1` |
| Draft PR | #10 → `implementation/bootstrap` |
| Verified code HEAD before this documentation finalization | `b3c2108e831051af093ff5eb982be557600715a7` |
| GitHub Actions | `37131349009` — **SUCCESS** |
| Merge ordering | **PR #9 first, then PR #10** |

Release-candidate QA extends the already-green Vertical Slice Critical Journey with supplemental WebKit coverage and an explicit offline PWA reload/save-resume check.

## 1. Validation surface

### Chromium responsive suite
Full Playwright suite:
- 360px
- 390px
- 412px

Result:
- **36/36 PASS**

The count includes the new offline-PWA test at all three Chromium widths.

### WebKit supplemental compatibility
Targeted 390px suite:
- shell/mobile layout;
- PWA/manifest/storage behavior;
- full Vertical Slice Critical Journey.

Result:
- **4/4 PASS**
- Chromium-only offline-PWA test is intentionally skipped under WebKit.

WebKit on GitHub-hosted Linux is **supplemental browser-engine evidence only**. It is not physical iPhone Safari validation.

### Foundation / deterministic checks
- typecheck: PASS
- content validation: PASS
- domain smoke: PASS 4/4
- Vitest: **90/90 PASS**
- battle golden: **7/7 PASS**
- architecture boundaries: **2/2 PASS**
- build/PWA: PASS

## 2. Offline PWA evidence

New Chromium test:
`offline PWA reload keeps the app shell and IndexedDB save available`

Flow:
1. load built PWA;
2. wait for Service Worker readiness;
3. reload until controlled;
4. capture IndexedDB auto-save;
5. force browser context offline;
6. reload from Service Worker precache;
7. verify app returns to World scene and Save status is ready;
8. compare IndexedDB save before/after offline reload;
9. verify Workbox precache exists and `three-kingdoms-web` IndexedDB remains present.

Observed at 360 / 390 / 412:
- offline boot: PASS
- Service Worker controller: PASS
- app-shell precache: PASS
- IndexedDB save equality: PASS

This validates the designed separation:
- Service Worker cache = application shell/static assets
- IndexedDB = Save source of truth

## 3. Critical Journey compatibility

The complete Vertical Slice Critical Journey remains green under:
- Chromium 360
- Chromium 390
- Chromium 412
- WebKit 390

Journey:
`Zhuo → Scout → Baishui → Jian Yong → Forest search → Side Path → Forest Recluse → Outpost → North Gate → Capture`

Chromium automation durations:
- 360: approximately 39s
- 390: approximately 41s
- 412: approximately 44s

WebKit 390:
- approximately 40s

These automation durations are **not** evidence for the PRD human-playtime target of 20–30 minutes.

## 4. Release-candidate interpretation

Automated browser confidence is now materially stronger:
- three Chromium mobile widths;
- one WebKit mobile profile;
- full gameplay Critical Journey;
- Save persistence;
- offline PWA reload;
- deterministic battle/progression regression.

Still outside automated acceptance:
- physical Android Chrome;
- physical iPhone Safari;
- installed PWA behavior on physical devices;
- real-device performance/FPS/memory/thermal behavior;
- human comprehension/pacing/fun;
- assistive-technology accessibility;
- SHOP/equipment loop.

## 5. Branch / merge ordering

PR #10 is stacked on PR #9.

Required order:
1. Merge PR #9 into `implementation/bootstrap`.
2. Re-evaluate/retarget PR #10 diff against the new integration head.
3. Re-run PR #10 final validation if its effective diff/head changes.
4. Merge PR #10 only after separate Human Gate approval.

Do not merge PR #10 ahead of PR #9.

## 6. Gate

- Automated Chromium RC QA: **PASS**
- Supplemental WebKit QA: **PASS**
- Offline PWA: **PASS**
- Real-device acceptance: **NOT_RUN**
- Human playtest: **NOT_RUN**
- PR #9 integration: **BLOCKED BY DRAFT-STATE USER ACTION**
- PR #10 merge: **HUMAN GATE / ORDERED AFTER PR #9**
