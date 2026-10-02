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

Secret discovery status:
- player-facing secret discovery is IMPLEMENTED through the generic `SEARCH_LOCATION` progression trigger;
- Baishui Forest exposes `주변 수색` only after the content-defined conditions are met;
- successful search discovers `LOC_FOREST_SIDE_PATH`, after which normal adjacency travel exposes the secret path;
- secret rules are content-driven and are not hard-coded in Phaser or React.

Deferred:
- dedicated maps for Baishui Forest / side path / Outpost / North Gate;
- shop flow.



## Secret Area v1

The exploration layer supports explicit data-driven searches.

Pattern:

`SEARCH_LOCATION trigger → content conditions → DISCOVER_LOCATION effect → normal travel`

Vertical Slice implementation:
- Baishui Forest secret search requires Baishui visit and Jian Yong membership;
- `LOC_FOREST_SIDE_PATH` is absent from travel until discovered;
- entering the discovered side path enables the existing optional NPC/recruit event;
- the full loop is autosaved and covered by mobile E2E.

This pattern should be reused for future hidden caves, alternate routes, secret NPCs and optional exploration rewards.

## Field Presentation v1

Field rendering is now location-driven.

`Save Location → FieldPresentation → WorldScene`

Implemented full Phaser fields:
- `LOC_SOUTH_PLAIN`
- `LOC_BAISHUI_FOREST`

Baishui Forest:
- uses the same pure Tap-to-Move / visible-enemy world simulation as South Plain;
- presents `ENC_BAISHUI_FOREST_AMBUSH` as a visible patrol;
- contains a discovery-controlled visual marker for `LOC_FOREST_SIDE_PATH`;
- same-location secret discovery updates marker visibility without resetting the player.

Field presentation definitions remain outside Phaser and contain no React dependency.

Deferred:
- Outpost / North Gate / Side Path dedicated field presentations;
- in-field exit/interact hotspots;
- shop flow.

## Field Presentation v2

Combat-critical Vertical Slice locations now have Phaser fields:
- South Plain
- Baishui Forest
- Yellow Turban Outpost
- North Gate

Field exits use:

`FieldHotspot proximity → Phaser runtime event → accessible React action → enterLocation()`

Travel legality remains owned by `availableConnections()`.

Therefore:
- locked/undiscovered destinations do not become active field exits;
- the Outpost does not expose North Gate before the Outpost-victory progression event;
- field presentation does not own Save mutation or story gating.

World simulation pauses while Location/NPC sheets are open.

Deferred:
- consolidated Outpost-victory → North-Gate browser journey;
- direct canvas hotspot activation;
- Town/Village/Side Path/North Road dedicated field presentation.

