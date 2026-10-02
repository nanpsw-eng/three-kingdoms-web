# PROGRESSION & RETREAT v1 REPORT — 2026-10-02

## 0. Summary

| Item | Result |
|---|---|
| Repository | `nanpsw-eng/three-kingdoms-web` |
| Base | `implementation/bootstrap@5ad07befde0747ee6641688a795b42c70ddbe565` |
| Feature branch | `feature/progression-retreat-v1` |
| Verified code HEAD | `6dab77d03cf4ff946d0b2b75bbf2ac7cfc740fc7` |
| Draft PR | #8 → `implementation/bootstrap` |
| GitHub Actions | `36994297632` — **SUCCESS** |
| Merge | **NOT_PERFORMED — Human Gate** |

This feature implements the first complete fixed-identity progression loop and replaces the remaining retreat prototype seam with an explicit deterministic policy.

## 1. BD-02 progression implementation

### Stable product rule
- Maximum level: **30**.
- A general's identity remains dominated by base stats, traits, unit type, aptitude and tactics.
- Level primarily increases troop capacity.
- Stats increase only at sparse content-defined milestones.
- Tactics may unlock at content-defined milestones; a recruit entering above a milestone starts with all tactics earned up to that level.
- Static milestone bonuses are derived from Content + level and are **not** copied into Save.

### Balance proposal
Save `xp` means progress within the current level.

Next-level XP:
`40 + 20 × currentLevel`

Examples:
- Lv1→2: 60
- Lv2→3: 80
- Lv3→4: 100
- Lv4→5: 120
- Lv5→6: 140
- Lv29→30: 620

### XP distribution
On victory:
- battle participants: **100% encounter XP**
- reserve generals: **50% XP**, floor-rounded
- no duplicate award if a participant is somehow also listed in reserve

### Level-up troop behavior
Level-up increases maximum troops using the existing per-general troop-growth data.

Current troops increase only by the newly gained max-capacity delta.
This:
- avoids a full heal on level-up;
- preserves existing battle damage;
- keeps routed generals at **0 troops**, so a level-up cannot silently revive them.

### Milestones
Schema now supports `levelMilestones`:
- `level`
- sparse `statBonuses`
- `tacticIds`

Vertical Slice examples:
- Liu Bei unlocks `TAC_INSPIRE` at Lv4.
- Forest Recluse unlocks `TAC_CONFUSE` at Lv5.
- core-stat increases are intentionally sparse, primarily Lv10/20/30.

Effective battle stats are derived via `effectiveStatsAt()`.

### Recruitment-level milestone safety

`learnedTacticsAtLevel()` derives initial learned tactics from the general's initial tactics plus every milestone at or below the supplied level. Therefore future content can recruit a general above Lv1 without silently missing already-earned tactics.

## 2. Vertical Slice pacing check

For a starter participating in:
- South Plain Scouts: 40 XP
- Baishui Forest: 70 XP
- Outpost: 120 XP
- North Gate: 250 XP

Total 480 XP produces approximately:
- Lv1→2: 60
- Lv2→3: 80
- Lv3→4: 100
- Lv4→5: 120
- remainder at Lv5: 120 / 140

So the main-route starter ends around **Lv5**.

If the optional South Plain Riders battle (+50 XP) is also completed, the same starter reaches approximately **Lv6 with 30 XP**.

This is suitable as a first Vertical Slice tuning baseline and remains `BALANCE_PROPOSED`.

## 3. BD-03 retreat implementation

Rule:
- `canRetreat=true` → retreat succeeds immediately and deterministically.
- current troops persist;
- no XP/gold gain or loss;
- encounter remains active.
- Boss encounters cannot have `canRetreat=true`.
- Non-boss story battles may explicitly disable retreat.

Existing BattleScreen behavior already hides the Retreat button when `canRetreat=false`.

The encounter schema now rejects any Boss configured with retreat enabled.

## 4. Save compatibility

Save version remains **v1**.

Existing fields are reused:
- `level`
- `xp`
- `currentTroops`
- `learnedTacticIds`

Save validation now caps player general level at 30.

No migration is required for current project saves because existing saves are below the new cap.

## 5. UI feedback

After battle resolution:
- level gains are surfaced in the world status notice;
- newly learned tactics are listed in the same notice.

The state updater remains pure: progression is calculated outside the React updater and the finalized Save is committed.

## 6. Verification

GitHub Actions `36994297632` on `6dab77d03cf4ff946d0b2b75bbf2ac7cfc740fc7`:

- typecheck: PASS
- content validation: PASS
- domain smoke: PASS 4/4
- Vitest: **89/89 PASS**
- battle golden: **7/7 PASS**
- architecture boundaries: **2/2 PASS**
- build/PWA: PASS
- Chromium E2E: **30/30 PASS**

New regression coverage includes:
- XP cost table;
- multi-level gain;
- Lv4 tactic unlock;
- troop-capacity delta;
- routed-unit no-revive;
- sparse stat derivation;
- Lv30 cap;
- participant 100% / reserve 50% XP;
- Boss retreat lock.

Existing Lv1 deterministic Battle Golden values remain unchanged.

## 7. Decision status

### DEC-003
`PROPOSED / IMPLEMENTED FOR REVIEW`

Fixed-identity structure is aligned with the approved Character direction. Exact XP costs/milestone placement remain balance-tunable.

### DEC-004
`PROPOSED / IMPLEMENTED FOR REVIEW`

The deterministic retreat policy is implemented and validated.

**Human merge approval for PR #8 should be treated as approval to establish both as the current integration baseline.**

## 8. Remaining work

After merge:
1. mark DEC-003 / DEC-004 APPROVED / IMPLEMENTED;
2. add consolidated full Vertical Slice browser E2E:
   `start → scout → Jian Yong → Forest/secret → Outpost victory → North Gate → capture`;
3. verify level progression across that complete journey;
4. then real Android/iPhone/PWA QA;
5. SHOP/equipment remains separate.

## 9. Gate

- Feature implementation: PASS
- Automated validation: PASS
- Real-device acceptance: NOT_RUN
- Merge PR #8 → `implementation/bootstrap`: **HUMAN APPROVAL REQUIRED**
