# DEC-003 — Fixed-Identity Level Progression

## Status
APPROVED / IMPLEMENTED — 2026-10-02

## Product rule
- Maximum level: **30**.
- Save `xp` means XP progress within the current level.
- Level progression primarily increases maximum troops.
- Core identity stats change only at sparse static milestones.
- Tactics may unlock at content-defined level milestones; generals recruited above an unlock level start with all tactics earned up to that level.
- Active battle participants receive **100% encounter XP**.
- Reserve generals receive **50% encounter XP**, rounded down.
- Level-up does not fully heal. Current troops increase only by the newly added max-troop capacity.
- At Lv.30, further XP is discarded.

## Balance proposal
XP required for the next level:
`40 + 20 × currentLevel`

Examples:
- Lv1→2: 60
- Lv2→3: 80
- Lv3→4: 100
- Lv4→5: 120
- Lv5→6: 140
- …
- Lv29→30: 620

This is intentionally separable from the product rule and may be retuned through tests/playtest without changing the fixed-identity model.

## Save compatibility
No Save schema version change is required. Existing fields `level`, `xp`, `learnedTacticIds`, and `currentTroops` are sufficient. Static stat milestones remain content-derived and are not persisted.

## Approval / integration gate
The product rule is approved and integrated into `implementation/bootstrap` by PR #8. Exact XP costs and milestone placement remain balance-tunable.
