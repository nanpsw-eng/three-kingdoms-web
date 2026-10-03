# MOBILE BATTLE UX SPEC v0.1

## Approved core
Smart Command is the default battle interaction.

## UX rules
- Each turn starts with basic attack commands preselected.
- Player edits only generals requiring tactics/defense/items/target changes.
- One ordinary turn should be executable with a single `전투개시` tap.
- One tactic override should be achievable within roughly five primary taps.
- Player can inspect all five current commands before execution.
- Targets are selected by directly tapping enemy portrait/sprite.
- Tactic and formation selectors use bottom sheets rather than full navigation changes.
- Auto battle must be stoppable with one tap.
- Critical actions remain accessible without hover and without precision tapping.

## Layout
Portrait 9:16. Battle visualization roughly 65–70%; controls 30–35% as an initial target. Critical buttons target >=44px, preferably 48px.

## Recovery
Battle state should checkpoint at safe boundaries such as battle start/turn end/battle end so mobile backgrounding or reload can recover safely.
