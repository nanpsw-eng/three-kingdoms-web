# PROJECT THREE KINGDOMS

모바일 퍼스트 삼국지 군단 RPG 웹게임.

핵심 경험은 장수 영입, 병력 기반 턴제 전투, 책략·진형, Semi-open 지역 탐험, 도시·관문 공략이다.

## Product baseline
- Mobile-first portrait PWA
- Tap-to-Move 기본, Virtual d-pad 선택
- Visible Encounter
- 최대 5인 Party
- Smart Command 턴제 전투
- 병력 = HP + 군사력
- 고정 개성형 장수 성장
- 지역별 Semi-open Field
- Data-driven content: TypeScript/Zod schema + JSON
- Vite + React + Phaser 4
- IndexedDB/Dexie local save
- GitHub Actions OFF during initial development
- Local/Codex-first validation via repository scripts

## Source of Truth
- Product requirements: `docs/product/PRD.md`
- Game specs: `docs/specs/`
- Durable decisions: `docs/decisions/`
- AI-OS binding: `docs/ai-dev/AI_OS_BINDING.md`
- Current execution state: `docs/ai-dev/SESSION_HANDOFF.md`

## Current state
`implementation/bootstrap` holds the integrated Vertical Slice (PRs #2–#10): content validation, deterministic battle core,
SaveGame v1 + IndexedDB, world/secret/field presentation, progression and retreat, full Critical Journey E2E, RC QA (WebKit + offline PWA).
Equipment / Shop v1 (FR-008, DEC-005 PROPOSED) is in progress on a feature branch.
Real-device validation and human playtest are `NOT_RUN`. See `docs/ai-dev/SESSION_HANDOFF.md`.

## Commands
- `npm ci` — install
- `npm run dev` — local dev server
- `npm run verify:foundation` — full local gate (typecheck, content, unit, golden, build, Chromium E2E)
- `npm run check` — gate without E2E
