# GAME DATA SCHEMA v0.1

## Approved direction
TypeScript/Zod schemas + JSON content.

## Separation
- Content Data: static game definitions
- Runtime State: current session/transient battle/world state
- Persistent Save State: player progress across sessions

## Stable IDs
Prefixes: `GEN_`, `UNIT_`, `TRT_`, `TAC_`, `FORM_`, `WPN_`, `ARM_`, `ACC_`, `REG_`, `LOC_`, `ENC_`, `QST_`, `EVT_`, `FLAG_`, `NPC_`, `ITEM_`.

## Core entities
General, UnitType, Trait, Tactic, StatusEffect, Formation, Equipment, Region, Location, Encounter, EnemyArchetype, Quest, Event, StoryFlag, Faction, SaveGame.

## General principle
New content should normally be introduced through data and assets, not hard-coded checks in the engine.

## Validation
Build/CI should reject duplicate IDs, broken references, invalid stat ranges, missing required assets/references and broken quest/event links.

## Save
Persist changing state only: level/xp, current troops, equipment, learned tactics, party, inventory, quest progress, flags, ownership/discovery, checkpoint and battle snapshot when needed. Do not duplicate static base stats in saves.

## Versions
Maintain separate schema version, content version and save version. Save migration must be explicit and testable.
