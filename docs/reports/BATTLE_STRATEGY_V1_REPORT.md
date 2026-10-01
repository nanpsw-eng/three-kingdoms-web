# BATTLE STRATEGY v1 REPORT — 2026-10-02

## 0. Summary

| Item | Result |
|---|---|
| Repository | `nanpsw-eng/three-kingdoms-web` |
| Base | `implementation/bootstrap@8dbfe6c702d0b809705fc480c9b210a4f70eeb7e` |
| Feature branch | `feature/battle-strategy-v1` |
| Verified code HEAD | `06a75b4c1df35cb14ee84ccf1f35b3b4ef50f6be` |
| GitHub Actions run | `36941533216` |
| Validation | **PASS** |
| Merge | **NOT_PERFORMED — Human Gate** |

This feature implements the approved defeat-recovery decision and adds the first strategic boss-response loop: content-driven boss telegraph, deterministic enemy tactic AI, formation selection before battle, and quantitative balance probes.

## 1. Implemented

### BD-01 defeat recovery
`DEC-002-DEFEAT-RECOVERY.md` is now implemented in `src/game/save/applyBattle.ts`.

On player defeat:
- return to the most recent valid safe checkpoint location represented by `save.world.checkpointId`;
- restore each active-party general to **30% of maximum troops**, minimum 1;
- no gold loss;
- no XP loss;
- encounter remains active;
- battle checkpoint is cleared.

Unit coverage verifies troops, world return, gold/XP preservation and save serialization.

### Content-driven boss telegraph
Encounter schema supports a telegraph record:
- announce turn;
- later execute turn;
- actor general;
- tactic;
- localized warning message.

Reference validation rejects missing actors/tactics and requires the actor to actually know the declared tactic.

The North Gate boss declares `TAC_FIRESTORM` on turn 2 and attempts it on turn 3 if the commander is still able to act and has sufficient TP.

### Deterministic enemy tactic AI
Enemy command orchestration now considers, in deterministic order:
- content-driven forced telegraphed tactic;
- healing a critically depleted ally when available;
- opening party support;
- periodic control tactic;
- periodic damage tactic;
- Smart basic attack fallback.

Playback speed remains outside the battle-session input and therefore cannot affect battle results.

### Formation selection UI
The encounter sheet exposes currently unlocked formations before battle.
Selection updates `save.party.formationId` and is passed into the created BattleState.
The mobile E2E verifies that the selected `FORM_WEDGE` reaches the battle panel.

### Telegraph warning UI
Battle UI exposes the current warning as an accessible status banner.

## 2. Verification evidence

GitHub Actions validation-only run:
- Run ID: `36941533216`
- Verified HEAD: `06a75b4c1df35cb14ee84ccf1f35b3b4ef50f6be`
- Conclusion: **SUCCESS**

Observed:
- typecheck: PASS
- content validation: PASS
- domain smoke: PASS 4/4
- Vitest: **73/73 PASS**
- battle golden: **7/7 PASS**
- architecture boundaries: **2/2 PASS**
- build: PASS
- Chromium responsive E2E: **18/18 PASS** at 360 / 390 / 412 widths

Still NOT_RUN:
- real Android Chrome
- real iPhone Safari
- installed-PWA real-device behavior
- Playwright WebKit as supplemental browser evidence
- representative-device FPS measurement
- lint remains NOT_CONFIGURED

## 3. Balance probe — 50 deterministic seeds

### Vertical Slice baseline

| Encounter | Result | Avg turns | Avg troop loss |
|---|---:|---:|---:|
| South Plain Scouts | 50/50 victories | 2.8 | 16% |
| South Plain Riders | 50/50 victories | 2.0 | 5% |
| Baishui Forest Ambush | 50/50 victories | 2.0 | 3% |
| Yellow Turban Outpost | 50/50 victories | 4.0 | 20% |
| North Gate Boss — Smart / Crane | 50/50 victories | 8.8 | **76%** |

The boss remains beatable with Smart-only play, but the cost is now severe.

### Strategic-response comparison

| Strategy | Avg turns | Avg troop loss | Interpretation |
|---|---:|---:|---|
| Smart-only / Crane | 8.8 | 76% | Baseline |
| All defend on telegraph execute turn | 12.8 | 90% | **Worse**; not a recommended response |
| Basic-attack focus commander | 9.7 | 94% | **Worse**; raw focus fire alone does not interrupt reliably |
| **Control commander with Confuse** | **7.3** | **54%** | **Meaningful benefit**; disables the declared action when successful |

### Formation comparison — Smart-only boss

| Formation | Avg turns | Avg troop loss |
|---|---:|---:|
| **Wedge** | **6.0** | **59%** |
| Circle | 8.1 | 68% |
| Crane | 8.8 | 76% |

## 4. Product interpretation

The former risk “tactics/formations have no meaningful value because Smart-only always wins” is **partially remediated**.

- Smart-only still wins the current deterministic probe, so difficulty is not yet validated by human playtest.
- However, **control-tactic response reduces troop loss from 76% to 54%** and shortens the fight.
- **formation choice reduces troop loss from 76% to 59%** and changes duration materially.
- Therefore tactics and formations now produce measurable combat value without changing core battle formulas.

Important UX note:
- “Defend” is not currently the efficient telegraph response.
- The intended useful response is to **disrupt/control the telegraphed commander** or choose a more suitable formation.
- Tutorial/warning wording should eventually communicate this rather than imply that universal defense is optimal.

## 5. Remaining decisions / risks

### Product decisions
- `BD-02`: level-up XP curve and tactic-unlock schedule — OPEN.
- `BD-03`: retreat success/penalty rule — OPEN.

### Risks
1. **Human playtest still required.** Simulation demonstrates mechanical value, not perceived strategy/fun.
2. Real-device mobile/PWA acceptance remains NOT_RUN.
3. Current North Gate boss and some story content remain `PROVISIONAL_CONTENT_REVIEW_REQUIRED`.
4. The current telegraph is one data case; additional bosses should reuse the schema rather than add hard-coded engine branches.
5. Warning/tutorial copy should explain disruption/control as one valid response.

## 6. Recommended next implementation

After this feature is integrated:
1. Location travel + NPC interaction UI using the existing progression engine.
2. Village/outpost rest and recovery UI.
3. Add a playable route through more than the current placeholder field.
4. Resolve BD-02 and implement fixed-identity level progression.
5. Resolve BD-03 retreat behavior.
6. Real Android/iPhone/PWA device QA before the Vertical Slice acceptance gate.

## 7. Gate

- Feature implementation: **PASS**
- Repository validation: **PASS**
- Balance simulation: **PASS as evidence, not a release gate**
- Real-device acceptance: **NOT_RUN**
- Merge to `implementation/bootstrap`: **HUMAN APPROVAL REQUIRED**
