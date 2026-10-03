# PROJECT THREE KINGDOMS — Product Requirements Document

## 0. Document Control
- PRD ID: `PRD-TKW-001`
- Version: `0.4-bootstrap`
- Lifecycle State: `APPROVED`
- Owner: User
- AI-OS Binding: `v0.4.4@64b5115a698cc6a94cd8df80abb2ee7109010764`
- Last Updated: `2026-10-01`

## 1. Executive Summary
PROJECT THREE KINGDOMS는 패미콤 시대 삼국지 군단 RPG의 핵심 재미를 현대 모바일 웹게임 문법으로 재설계한 싱글플레이 중심 RPG다. 플레이어는 장수를 영입하고 최대 5인 군단을 편성하며, 병력·책략·진형·병종을 활용해 Semi-open 지역을 탐험하고 관문과 도시를 공략한다.

## 2. Product Vision
**장수를 찾아 영입하고 군대를 편성해 중국 대륙을 직접 탐험하며 천하통일을 향해 나아가는 모바일 군단 RPG.**

## 3. Product Pillars
1. 장수는 카드가 아니라 실제 전투 Party 구성원이다.
2. 병력은 HP이자 군사력의 핵심 표현이다.
3. 책략·군사·진형이 물리 공격과 동등한 전략 축을 가진다.
4. Stage Select가 아니라 지역을 직접 탐험한다.
5. 도시와 관문 점령은 실제 월드 상태를 변화시킨다.
6. 고전 감성은 유지하되 모바일 피로 요소는 현대화한다.

## 4. Primary Platform
- Smartphone Web / PWA first
- Portrait layout first
- Priority: Android Chrome → iPhone Safari → installed PWA → tablet → desktop
- Primary widths: 360 / 390 / 412px

## 5. Approved Interaction Model
- Field movement: Tap-to-Move
- Optional input: Virtual d-pad
- Encounter: Visible Enemy
- Battle input: Smart Command
- Fast battle: auto / all-attack / repeat / x1-x3 speed

## 6. Core Loop
`탐험 → 적/장수 조우 → 전투 → 보상 → 장수 영입/성장 → 편성 → 관문/성 공략 → 지역 점령 → 새 지역 개방`

## 7. Character Model
Core stats: 무력, 지력, 통솔, 속도. Core identity stats remain largely fixed. Level growth mainly increases troop capacity, unlocks tactics, and provides small milestone stat gains. No rarity tiers and no duplicate-general system.

## 8. Combat
- Up to 5 vs 5
- Troop = primary survival resource
- Smart Command defaults each general to basic attack and recommended target
- Tactics consume shared TP
- Formation affects party/slot modifiers
- Initial unit triangle: spear > cavalry > archer > spear
- Battle results should be deterministic for a given state, command set, and RNG seed where practical

## 9. World
- Region-based Semi-open fields
- Visible encounters with patrol/guard/chase/ambush behaviors
- Cities, villages, forts, gates, forests, dungeons, secret areas
- Main quest guidance prevents aimless progression; secrets preserve exploration
- Captured locations visibly change ownership and world state
- No global enemy level scaling

## 10. Vertical Slice
Target: 20–30 minutes.
Flow: 탁현 → 남부 평야 → 백수촌 → 백수림 → 황건 전초기지 → 북부 관문 Boss → 점령 후 북쪽 지역 개방.
Must validate Tap-to-Move, Visible Encounter, troop combat, Smart Command, tactics, formations, recruitment, world-state change, autosave and mobile usability.

## 11. MVP
Initial full MVP expands the Yellow Turban chapter to roughly 2–4 hours, with approximately 8–12 recruitable/playable generals, 10–15 enemy generals, 3+ formations, ~10 tactics and 15–20 equipment items.

## 12. Non-Goals
No MMO, PvP, guild, nation war, gacha, duplicate limit-break, energy gating, forced ads, crafting-heavy loop, city-management simulation, multiplayer or real-time chat in the MVP.

## 13. Material NFR
| ID | Category | Requirement |
|---|---|---|
| NFR-001 | Performance | Target 60 FPS in ordinary field/battle play; validate on representative devices |
| NFR-002 | Mobile | Critical gameplay must work touch-only at 360px width |
| NFR-003 | Reliability | Stable-state autosave and recoverable save migration |
| NFR-004 | Architecture | Domain rules independent from React/Phaser |
| NFR-005 | Accessibility | Critical information must not rely on color alone |
| NFR-006 | Privacy | Vertical Slice requires no login or personal data |
| NFR-007 | Content | IP-protected original game assets/data must not be copied |

## 14. Success Definition
Vertical Slice proceeds to MVP only if players understand troop combat, can operate Smart Command without excessive input, find recruitment rewarding, perceive tactics/formations as meaningful, and experience location conquest as a world-state achievement.

## 15. Requirements
- FR-001 World exploration via Tap-to-Move
- FR-002 Visible encounter system
- FR-003 Party management up to five active generals
- FR-004 Troop-based turn combat
- FR-005 Tactics and shared TP
- FR-006 Formation system
- FR-007 General recruitment
- FR-008 Equipment
- FR-009 Fixed-identity progression
- FR-010 Quest/story progression
- FR-011 City/gate conquest and world-state mutation
- FR-012 Local autosave and recovery
- FR-013 Smart Command / auto / repeat / all-attack / battle speed

## 16. Acceptance Gate
Vertical Slice critical journey must complete on Android Chrome and iPhone Safari, including save/reload, on a 360px-class layout. Required validation not yet executed remains `NOT_RUN`.

## 17. Risks / Unknowns
- Game feel and battle pacing remain unvalidated.
- Exact balance constants remain proposed until simulation/playtest.
- Final art direction and historical-content sourcing need separate content review.
- iOS PWA/storage behavior requires real-device validation.

## 18. IP Guardrail
The project may use classic gameplay ideas as inspiration but must not copy proprietary sprites, portraits, maps, UI, music, dialogue, distinctive creative assets or original game data tables.
