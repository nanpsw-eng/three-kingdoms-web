# COMBAT SPEC v0.2

## Baseline
- Up to 5 vs 5 command-based turns.
- Commands currently implemented: attack, tactic, defend; party quick actions include auto, all-attack, repeat, retreat.
- Smart Command preselects basic attacks and recommended targets.
- Action order is primarily speed + formation/tactic/trait modifiers; large random initiative swings are avoided.

## Stats
Core stats: `strength`, `intelligence`, `command`, `speed`, normally 1–100.

## Troops
Troop count is the primary survival resource. At 0 troops a general routs, not permanently dies.
Current troop-power bands: 70–100% = 100%, 40–69% = 95%, 10–39% = 90%, 1–9% = 85% physical output.

## Physical formula
`AttackScore = 40 + strength*1.6 + weaponAttack + levelBonus`
`DefenseScore = 30 + command*1.2 + armorDefense + levelBonus`
`BaseDamage = 2.4 * AttackScore^2 / (AttackScore + DefenseScore)`
Final modifiers: troop, unit, formation, trait, status, defend, seeded random 0.95–1.05.
The v0.1 deterministic numbers remain protected by golden tests.

## Tactics
Party-shared TP. Strategist intelligence contributes to TP capacity.
Implemented foundation effects: damage, heal, confusion/control, inspire/support, taunt.
Control success is bounded 25–95% and influenced by intelligence difference and traits.

## Initial unit matchup
- spear > cavalry
- cavalry > archer
- archer > spear

Current modifiers: 1.10 / 0.90.

## Formations
Vertical Slice formations: Wedge/추행진, Circle/방원진, Crane/학익진.
- unlocked formation selection is implemented before encounter battle start;
- formation party/slot modifiers feed the deterministic battle core;
- mid-battle formation changing is **NOT_IMPLEMENTED** and remains a later design item.

## Boss telegraph and enemy tactics
- Encounter data may declare `announceTurn`, a later `executeTurn`, one enemy actor, one learned tactic, and a localized warning.
- UI surfaces the warning before the declared action.
- If the actor is routed or disabled by a control effect, the declared action cannot execute normally.
- Enemy AI can deterministically spend TP on support/damage/control tactics using content-derived rule data.
- North Gate currently uses a `BALANCE_PROPOSED` telegraphed all-enemy fire tactic. Exact power is content tuning, not an engine constant.
- Engineering evidence shows that Jian Yong's Confuse response and formation choice materially change troop loss/duration. See `docs/reports/BATTLE_STRATEGY_V1_REPORT.md`.
- Smart-only still wins the current deterministic probe; human playtest remains required before claiming strategy/difficulty validation.

## Determinism
Domain logic resolves from battle state + commands + rules + RNG state. Rendering speed x1/x2/x3 does not affect results.

## Defeat recovery
Approved by DEC-002 and implemented:
- on player defeat, return to the most recent valid safe checkpoint / allied safe location represented by the save model;
- restore active-party generals to 30% of maximum troops (minimum 1);
- no gold loss;
- no XP loss;
- the encounter remains active unless story/event logic explicitly changes it.

## Progression and retreat
BD-02 implementation proposal:
- fixed-identity Lv.1–30 progression;
- XP costs and milestone rewards are documented in DEC-003;
- battle participants earn 100% encounter XP; reserves earn 50%.

BD-03 implementation proposal:
- retreat is deterministic when `canRetreat=true`;
- current troops persist;
- no gold/XP gain or loss;
- encounter remains active;
- bosses cannot allow retreat; story encounters may explicitly disable it.

See DEC-003 and DEC-004. Both are implemented for feature review and become the integration baseline only after the Human Merge Gate.
