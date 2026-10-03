# RELEASE CANDIDATE QA v1 REPORT — 2026-10-03

## 0. Summary

| Item | Result |
|---|---|
| Repository | `nanpsw-eng/three-kingdoms-web` |
| Integration base | `implementation/bootstrap@4f91d3899b45ebeb20cc744027a4bc017208371b` |
| Working branch | `feature/release-candidate-qa-v1` |
| Draft PR | #10 → `implementation/bootstrap` |
| Verified implementation HEAD before documentation finalization | `b3c2108e831051af093ff5eb982be557600715a7` |
| GitHub Actions | `37131349009` — **SUCCESS** |
| PR #9 | **MERGED** |

PR #10 is now a normal follow-on QA PR. The former stacked-PR ordering constraint has been resolved by PR #9 integration.

## 1. Validation surface

### Chromium
Full Playwright suite at:
- 360px
- 390px
- 412px

Result:
- **36/36 PASS**

New offline-PWA reload test passed at all three widths.

### WebKit supplemental compatibility
Targeted 390×844 Playwright WebKit suite:
- shell/mobile layout;
- manifest / service-worker / IndexedDB separation;
- responsive layout;
- full Vertical Slice Critical Journey.

Result:
- **4 PASS**
- Chromium-only offline test intentionally SKIPPED under WebKit.

Playwright WebKit on a GitHub-hosted Linux runner is **supplemental browser-engine evidence only** and is not physical iPhone Safari validation.

### Core engineering gate
- typecheck: PASS
- content validation: PASS
- domain smoke: PASS 4/4
- Vitest: **90/90 PASS**
- battle golden: **7/7 PASS**
- architecture boundaries: **2/2 PASS**
- build/PWA: PASS

## 2. Offline PWA evidence

Chromium flow:
1. boot the built PWA online;
2. wait for Service Worker readiness/control;
3. read the current IndexedDB auto-save;
4. switch browser context offline;
5. reload from Service Worker app-shell precache;
6. verify World scene and Save status return to ready;
7. read IndexedDB again;
8. verify save equality before/after offline reload.

Observed at 360 / 390 / 412:
- offline app-shell reload: PASS
- Service Worker controller: PASS
- Workbox precache present: PASS
- IndexedDB database present: PASS
- Save equality: PASS

This confirms the intended separation:
- Service Worker cache = application/static shell
- IndexedDB = Save source of truth

## 3. Critical Journey compatibility

The complete Vertical Slice Critical Journey passes under:
- Chromium 360
- Chromium 390
- Chromium 412
- WebKit 390

Journey:
`Zhuo → Scout → Baishui → Jian Yong → Forest search → Side Path → Forest Recluse → Outpost → North Gate → Capture`

WebKit Critical Journey automation: approximately 40 seconds.

Automation duration is not evidence for the PRD human-playtime target.

## 4. What this gate establishes

Automated browser evidence now supports:
- one complete gameplay journey in two browser engines;
- three Chromium mobile viewport widths;
- one WebKit mobile profile;
- IndexedDB persistence;
- Chromium offline PWA app-shell recovery;
- deterministic battle/progression regressions remaining green.

## 5. Still NOT validated

- physical Android Chrome;
- physical iPhone Safari;
- installed-PWA behavior on physical devices;
- OS background/kill/resume;
- representative-device FPS/memory/thermal/battery;
- touch feel on hardware;
- human 20–30 minute pacing;
- comprehension/fun;
- assistive-technology accessibility;
- SHOP/equipment loop.

## 6. CI policy

ADR-004 remains validation-only. PR #10 expands the allowed browser-validation surface to:
- Chromium full E2E;
- targeted WebKit supplemental compatibility.

It does **not** authorize deploy/release/tag/publish, secrets, external writes, scheduled polling, paid runners, or self-hosted runners.

## 7. Recommended next gate

After PR #10 integration:
1. physical Android Chrome smoke/critical journey;
2. physical iPhone Safari smoke/critical journey;
3. installed-PWA install/reload/resume;
4. representative-device performance observation;
5. short human Vertical Slice playtest;
6. then reassess PR #1 (`implementation/bootstrap → main`).

## 8. Gate

- Automated Chromium RC QA: **PASS**
- Supplemental WebKit QA: **PASS**
- Offline PWA recovery: **PASS**
- Physical-device acceptance: **NOT_RUN**
- Human playtest: **NOT_RUN**
- Merge PR #10 → `implementation/bootstrap`: **HUMAN APPROVAL REQUIRED**
