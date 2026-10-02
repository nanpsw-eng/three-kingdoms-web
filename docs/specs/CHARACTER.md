# GENERAL / CHARACTER SPEC v0.1

## Core identity
A general's value is the combination of stats, troops, unit type, weapon aptitude, tactics, unique trait and formation position. No user-visible S/A/B overall character tiers.

## Stats
- strength: physical attack
- intelligence: tactic power/success/resistance
- command: troop capacity/defense
- speed: action order

## Growth
Approved direction: fixed-identity growth. Core stats change only slightly through milestones. Level primarily increases troop capacity and unlocks tactics.

Approved BD-02 implementation:
- Lv.1–30;
- Save XP is current-level progress;
- next-level cost = `40 + 20 × currentLevel`;
- battle participants receive 100% encounter XP;
- reserve generals receive 50% XP;
- troop capacity follows each general's existing `baseTroop + perLevel` data;
- level-up adds only the newly gained troop-capacity delta to current troops, not a full heal;
- sparse stat/tactic milestones are static content and are derived from level;
- Lv.30 discards further XP.

The fixed-identity model and Lv.30 cap are approved product rules. Exact XP costs and milestone placements remain `BALANCE_PROPOSED` and may be retuned after playtest.

## Units
Vertical Slice uses spear/cavalry/archer.

## Traits
Major generals receive at least one unique trait, preferably expressed through generic trigger/condition/effect data rather than hard-coded general checks.

## Recruitment
Types: story, battle, quest, secret. Prefer condition-complete guaranteed recruitment in MVP over repeated low-probability rolls. No duplicate generals.

## Initial roster anchors
- Liu Bei: balanced/support
- Guan Yu: physical/commander
- Zhang Fei: heavy physical
- Jian Yong: support/tactic
- one optional hidden recruit for exploration validation
