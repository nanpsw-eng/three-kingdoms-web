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
