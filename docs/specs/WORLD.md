# WORLD / EXPLORATION SPEC v0.1

## Approved model
Region-based Semi-open field using Tap-to-Move and Visible Encounter.

## World hierarchy
World → Region → Location / Encounter / NPC / Event / Quest / Transition.
Location types include city, village, field, forest, dungeon, fort, gate, battlefield and secret area.

## Movement
Tap empty ground to move. Tap NPC/enemy/object to approach and interact. Short pathfinding may avoid nearby obstacles, but full-region auto-navigation is avoided.

## Encounters
Enemy field behaviors: patrol, guard, chase, ambush. Players should be able to avoid at least some ordinary battles. No global player-level scaling; region/story difficulty is fixed enough to preserve a sense of becoming stronger.

## Conquest
Capture flows can include scouting → surrounding enemies → gate/wall → defending general → boss → ownership change. Ownership changes should affect flags, NPCs, encounter density, services and fast travel where relevant.

## Guidance
Main quests provide sufficient navigation to prevent aimless blocking. Secret content may provide regional hints rather than exact markers.

## Mobile pacing
Villages should expose major services within roughly 30–60 seconds. Typical small dungeons target roughly 5–10 minutes.

## World Interaction v1 implementation status

The Vertical Slice now has a data-driven application interaction layer above the world/progression domain:

- adjacent travel is derived from `Location.connections`;
- locked regions cannot be entered;
- undiscovered SECRET and GATE destinations remain hidden;
- entering a location discovers it and dispatches `ENTER_LOCATION`;
- SAVE_POINT locations update the recovery checkpoint;
- NPC interaction dispatches `TALK_NPC`;
- REST services invoke the existing party recovery effect;
- active encounters at non-field locations can start the common BattleSession flow.

Rendering boundary:
- `LOC_SOUTH_PLAIN` remains the currently implemented Phaser Semi-open field;
- other locations use mobile React location surfaces over a paused field until their dedicated field presentation is implemented;
- this is an implementation staging choice, not a change from the approved Semi-open world model.

Deferred:
- player-facing secret-path discovery action;
- dedicated maps for Baishui Forest / Outpost / North Gate;
- shop flow.

