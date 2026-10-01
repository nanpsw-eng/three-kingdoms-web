# COMBAT SPEC v0.1

## Baseline
- Up to 5 vs 5 command-based turns.
- Commands: attack, tactic, defend, item, wait; party-level quick actions: auto, all-attack, repeat, formation, retreat.
- Smart Command preselects basic attacks and recommended targets.
- Action order is primarily speed + formation/tactic/trait modifiers; large random initiative swings are avoided.

## Stats
Core stats: `strength`, `intelligence`, `command`, `speed`, normally 1–100.

## Troops
Troop count is the primary survival resource. At 0 troops a general routs, not permanently dies.
Proposed troop-power bands: 70–100% = 100%, 40–69% = 95%, 10–39% = 90%, 1–9% = 85% physical output.

## Proposed physical formula
`AttackScore = 40 + strength*1.6 + weaponAttack + levelBonus`
`DefenseScore = 30 + command*1.2 + armorDefense + levelBonus`
`BaseDamage = 2.4 * AttackScore^2 / (AttackScore + DefenseScore)`
Final modifiers: skill, troop, unit, formation, trait, seeded random 0.95–1.05.
All coefficients remain balance-proposed until simulation/playtest.

## Tactics
Party-shared TP. Strategist intelligence contributes to TP capacity. Tactic families: attack, support, heal, control, strategy.
Status/control success should be bounded (initial proposal 25–95%) and influenced by caster/target intelligence, terrain, formation and traits.

## Initial unit matchup
- spear > cavalry
- cavalry > archer
- archer > spear
Initial proposed modifiers: 1.10 / 0.90.

## Formations
Vertical Slice: wedge, circle/defensive, crane. Formations change party and/or slot modifiers. Mid-battle formation changes carry a speed penalty rather than consuming the whole turn.

## Bosses
Bosses require telegraphed high-impact actions and strategic response. Vertical Slice boss target: 6–9 turns first play, 4–7 skilled.

## Determinism
Domain logic should resolve from battle state + commands + RNG state. Rendering speed x1/x2/x3 must not change results.

## Defeat recovery
Approved by DEC-002:
- on player defeat, return to the most recent safe checkpoint / allied safe location represented by the save model;
- restore active-party generals to 30% of maximum troops (minimum 1);
- no gold loss;
- no XP loss;
- the encounter remains active unless story/event logic explicitly changes it.

Implementation verification remains separate from this specification.
