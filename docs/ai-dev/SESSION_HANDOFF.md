# SESSION HANDOFF — Bootstrap + Battle Core + App Shell

## Current State
- Repository: `nanpsw-eng/three-kingdoms-web`
- Visibility: `PUBLIC`
- Default Branch: `main`
- Working Branch: `implementation/bootstrap`
- Draft PR: `#1 Bootstrap project and add deterministic battle core`
- Main initialization commit: `28f16840203ac7c8e5d0f5d650c0dfa0279716dc`
- Current branch head: `8814526cfa042dbd615aec16d53e73f7e76f1717`
- Current Gate: `BOOTSTRAP_IMPLEMENTED / DEPENDENCY_INSTALL_AND_FULL_BUILD_PENDING`

## AI-OS Execution Snapshot
- AI-OS: `v0.4.4@64b5115a698cc6a94cd8df80abb2ee7109010764`
- Risk Tier: `RISK_MEDIUM`
- Context Budget: `FOCUSED`
- Agent Budget: `1 writer / 0 reviewer`
- Test Budget: `T1 TARGETED`
- CI Policy: `LOCAL_FIRST / GITHUB_ACTIONS_DISABLED`
- Actual Surface: `CHAT + connected GitHub + local runtime`

## Completed
- Public GitHub repository initialized.
- `implementation/bootstrap` branch and Draft PR #1 created.
- AI-OS Binding, AGENTS, approved PRD, ADRs and core game specs persisted.
- Current stable package versions pinned for React/Vite/Phaser/Zod/Dexie/Vitest/Playwright.
- Pure TypeScript deterministic physical battle core implemented.
- Seeded RNG implemented; domain code does not use `Math.random()`.
- Initial spear/cavalry/archer matchup implemented.
- Smart Command attack recommendation implemented.
- Turn resolution supports attack and defend without mutating input state.
- Zod General schema added.
- Initial JSON content added for Liu Bei, Guan Yu, Zhang Fei and Jian Yong.
- Vite/React/PWA mobile application shell scaffold added.
- Initial portrait mobile shell includes quest, party summary and bottom navigation with >=48px primary touch targets.

## Verification
### PASS
1. `npm run test:domain`
   - TypeScript domain compilation: PASS using locally available TypeScript 5.8.3
   - Node smoke tests: 4 PASS / 0 FAIL
   - Coverage target: unit triangle, deterministic RNG/damage, Smart Command generation, immutable turn resolution
2. JSON syntax/basic invariants for initial general content
   - 4 files parsed successfully
   - stable IDs unique
   - core stats within 1..100

### NOT_RUN
- `npm install` — current working container has no external package network access
- Project TypeScript 7.0.2 full typecheck
- React/Vite application build
- Zod runtime parse of JSON content
- Vitest suite
- Playwright E2E
- Phaser runtime
- Real mobile device validation
- PWA install/cache validation
- GitHub Actions: DISABLED BY ADR-004

## Package Baseline
- React / React DOM 19.3.0
- Vite 8.3.2
- Phaser 4.2.1
- Zod 4.6.5
- Dexie 4.4.6
- Vitest 5.0.3
- Playwright 1.63.0
- TypeScript 7.0.2
- @types/react / @types/react-dom 19.3.0
- @types/node 22.20.2

## Next Task
1. Run `npm install` in a network-enabled development/Codex runtime.
2. Run full `npm run typecheck`, `npm test`, `npm run build`.
3. Resolve any TypeScript 7 / dependency integration issues.
4. Implement Zod content registry/reference validation and traits/tactics referenced by the first four generals.
5. Add Phaser boot/world placeholder and typed React↔Phaser bridge after baseline remains green.
6. Begin Tap-to-Move Vertical Slice world prototype.

## REQUIRED_CONTEXT
- `AGENTS.md`
- `docs/ai-dev/AI_OS_BINDING.md`
- `docs/product/PRD.md`
- `docs/decisions/DECISION_INDEX.md`
- `docs/specs/TECHNICAL_ARCHITECTURE.md`
- `docs/specs/COMBAT.md`
- this Handoff

## ON_DEMAND_CONTEXT
- Character, World, Mobile Battle UX, Game Data Schema and Vertical Slice specs.

## Human Gate
- Merge Draft PR #1 to `main`: REQUIRED
- Production deploy/public release: REQUIRED
