# OVERNIGHT FOUNDATION TASK GRAPH

> Purpose: allow one unattended Claude Code session to advance the foundation safely without waiting for ordinary human choices.
> Execution mode: `SEQUENTIAL`
> Writer count: `1`
> Base branch for continuation: `implementation/bootstrap`
> Human-gated branch: `main`

## Global execution contract

- Read `AGENTS.md`, `docs/ai-dev/AI_OS_BINDING.md`, `docs/product/PRD.md`, `docs/decisions/DECISION_INDEX.md`, `docs/specs/TECHNICAL_ARCHITECTURE.md`, and `docs/ai-dev/SESSION_HANDOFF.md` first.
- Recover current repository truth before changing anything. Do not trust this document over Git.
- Create/resume `implementation/foundation-nightly` from the current remote `implementation/bootstrap` HEAD. Do not write directly to `main`.
- Keep Draft PR #1 untouched as the bootstrap integration gate. The overnight branch should target `implementation/bootstrap` with its own Draft PR.
- One logical green unit per commit. Push after each completed phase.
- Do not use force-push, reset shared history, rewrite main, merge, tag, release, deploy, purchase services, create paid resources, expose secrets, or add third-party copyrighted assets.
- Product decisions already approved in PRD/DECISIONS are fixed. Minor implementation ambiguity: choose the smallest reversible solution and document it. Material product ambiguity: leave a neutral seam/stub, record `BLOCKED_DECISION`, continue independent tasks.
- `NOT_RUN != PASS`; preserve failed evidence.

## Retry policy

- Default `max_attempts: 2` for the same technical failure with the same approach.
- On attempt 2 failure: record the root cause/evidence, mark the task `BLOCKED`, do not keep looping, and continue any independent READY task.
- Network/package-manager transient failures may use one additional retry only if the failure is clearly transient.
- Authentication/permission, policy, destructive migration, secrets, external-account, or paid-resource failures are not retryable without a preapproval already recorded here.

## Conditional GitHub Actions preapproval

User message on 2026-10-01 conditionally authorizes changing the Actions-OFF policy **if actually needed** for unattended foundation verification.

Default remains `LOCAL_FIRST / GITHUB_ACTIONS_DISABLED`.

A validation-only GitHub Actions workflow may be added without waiting for another user reply **only if all are true**:
1. local Claude Code runtime cannot provide required reproducible verification or an independent post-push check materially reduces overnight blocking;
2. repository remains public and only standard free GitHub-hosted runners are used;
3. workflow performs validation only (install/typecheck/test/build/content validation, optionally browser E2E);
4. no secrets, deployment, release, package publishing, external write, paid/self-hosted runner, scheduled polling, or production environment;
5. trigger is limited to `workflow_dispatch` and/or PR validation; no deployment;
6. ADR-004 and Handoff are updated to record the scoped override.

If these conditions are not met, keep Actions disabled.

---

## N0 — Recovery and dependency baseline

- task_id: `N0_RECOVER_BASELINE`
- depends_on: none
- allowed_write_paths: package files, lockfile, config files, docs/ai-dev
- forbidden_paths: main history, production deploy config, secrets
- acceptance:
  - verify repo/remote/branch/HEAD/working tree;
  - create/resume nightly branch;
  - install exact project dependencies;
  - generate and commit lockfile;
  - run existing `npm run test:domain`;
  - run full `npm run typecheck`, `npm test`, `npm run build` where scripts are valid;
  - repair integration/type errors without changing approved architecture.
- verification: command output + exit status
- max_attempts: 2
- human_gate: NONE

## N1 — Content schema and validator

- task_id: `N1_CONTENT_VALIDATION`
- depends_on: N0
- allowed_write_paths: `src/game/schemas/**`, `src/game/content/**` or equivalent registry, `src/content/**`, `tests/**`, package scripts
- acceptance:
  - Zod schemas for at least General, Trait, Tactic, Formation, UnitType;
  - registry/loader parses JSON through Zod;
  - stable-ID uniqueness;
  - cross-reference validation for initial generals -> traits/tactics/unit types;
  - `npm run validate:content`;
  - tests for valid content and broken-reference failure.
- human_gate: NONE

## N2 — Initial foundational content

- task_id: `N2_CORE_CONTENT`
- depends_on: N1
- allowed_write_paths: `src/content/**`, localization/content tests
- acceptance:
  - define referenced traits for Liu Bei/Guan Yu/Zhang Fei/Jian Yong;
  - define referenced initial tactics;
  - define spear/cavalry/archer;
  - define wedge/circle/crane formations;
  - add minimal Korean localization keys needed by these records;
  - no copied original-game text/assets/data tables;
  - content validation PASS.
- human_gate: NONE

## N3 — Battle core v0.2

- task_id: `N3_BATTLE_CORE`
- depends_on: N2
- allowed_write_paths: `src/game/domain/battle/**`, centralized balance config, tests/simulation
- acceptance:
  - preserve deterministic seeded RNG;
  - add explicit battle outcome/win/rout detection;
  - apply defend modifier correctly;
  - implement party TP state;
  - implement minimal tactic execution required by first content set: attack, minor heal, confuse/control, inspire/support, taunt if already referenced;
  - implement formation party/slot modifiers for the first three formations;
  - keep formulas/config centralized;
  - no React/Phaser import in domain;
  - deterministic golden tests and regression tests PASS.
- non_goal: full final balancing, elaborate status engine, items, all future tactics
- human_gate: NONE

## N4 — Save model and local persistence seam

- task_id: `N4_PERSISTENCE`
- depends_on: N1
- allowed_write_paths: `src/game/domain/save/**`, `src/game/persistence/**`, schemas/tests
- acceptance:
  - SaveGame v1 schema;
  - content/static stats not duplicated unnecessarily;
  - explicit saveVersion;
  - migration function seam;
  - persistence interface separated from domain;
  - Dexie IndexedDB adapter;
  - safe checkpoint fields for world and battle;
  - pure save serialization/migration tests;
  - no backend/Auth/Supabase.
- human_gate: NONE

## N5 — React ↔ Phaser runtime boundary

- task_id: `N5_RUNTIME_BRIDGE`
- depends_on: N0
- allowed_write_paths: `src/game/runtime/**`, `src/game/phaser/**`, `src/app/**`, tests
- acceptance:
  - typed event/controller bridge;
  - Phaser Boot/Preload/World placeholder;
  - React component mounts/unmounts Phaser cleanly;
  - no domain import of React/Phaser;
  - placeholder visuals only, generated/procedural/local;
  - build PASS.
- human_gate: NONE

## N6 — Tap-to-Move + visible encounter prototype

- task_id: `N6_WORLD_PROTOTYPE`
- depends_on: N5
- allowed_write_paths: world runtime/phaser, content fixtures, tests
- acceptance:
  - simple Semi-open placeholder map;
  - tap/click converts pointer to world target;
  - player moves toward target and can retarget/cancel;
  - basic obstacle/path handling adequate for prototype;
  - one visible enemy with guard/chase behavior and aggro cue;
  - encounter bridge event emitted on contact;
  - no full-region auto-navigation;
  - touch behavior works at 360px viewport in browser test if runtime supports it.
- human_gate: NONE

## N7 — Mobile battle UI integration

- task_id: `N7_BATTLE_UI`
- depends_on: N3, N5
- allowed_write_paths: React battle UI, bridge, Phaser battle placeholder, tests
- acceptance:
  - render up to five allies/enemies;
  - show troops and current Smart Commands;
  - ordinary turn executable with one battle-start tap;
  - per-general override for attack/defend/implemented tactics;
  - target selection by touch;
  - auto/repeat/all-attack controls may be minimal but coherent;
  - x1/x2/x3 animation-speed state must not alter domain results;
  - critical touch targets >=44px;
  - build/typecheck/tests PASS.
- human_gate: NONE

## N8 — Vertical Slice data skeleton

- task_id: `N8_VERTICAL_SLICE_SKELETON`
- depends_on: N1, N2, N6
- allowed_write_paths: `src/content/regions/**`, quests/events/encounters/localization, content tests
- acceptance:
  - data skeleton for Zhuo -> south plain -> Baishui village -> Baishui forest -> Yellow Turban outpost -> north gate;
  - main quest progression skeleton;
  - Jian Yong recruitment event;
  - one optional recruit slot using a clearly provisional original data record if historical validation is unresolved;
  - outpost capture changes world-state data;
  - north-gate boss encounter data references only implemented capabilities;
  - schema/reference validation PASS.
- human_gate: NONE
- caution: do not invent historical claims as facts; label uncertain historical content `PROVISIONAL_CONTENT_REVIEW_REQUIRED`.

## N9 — PWA and responsive foundation

- task_id: `N9_PWA_RESPONSIVE`
- depends_on: N0, N5
- allowed_write_paths: Vite/PWA config, public app assets created in-project, React styles/tests
- acceptance:
  - PWA build configuration compiles;
  - app-shell cache only; save data remains IndexedDB;
  - 360/390/412 responsive checks;
  - no requirement for real-device iOS Safari; keep it `NOT_RUN` unless actually tested.
- human_gate: NONE

## N10 — Automated foundation gate

- task_id: `N10_FOUNDATION_GATE`
- depends_on: N3, N4, N6, N7, N8, N9 as available
- acceptance:
  - one repository command, preferably `npm run check` or `npm run verify:foundation`, executes applicable typecheck/content/unit/golden/build checks;
  - Playwright Chromium responsive smoke tests if browser runtime is available;
  - Playwright WebKit may be used as supplemental evidence but must not be reported as real iPhone Safari;
  - all failures classified PASS/FAIL/BLOCKED/NOT_RUN with evidence.
- human_gate: NONE

## N11 — Persist and report

- task_id: `N11_HANDOFF`
- depends_on: all attempted tasks
- acceptance:
  - update/create `docs/reports/OVERNIGHT_FOUNDATION_REPORT.md`;
  - update `docs/ai-dev/SESSION_HANDOFF.md` using AI-OS continuity protocol;
  - list exact implementation commit, tests executed, PASS/FAIL/NOT_RUN/BLOCKED, residual risk;
  - push nightly branch;
  - open/update Draft PR targeting `implementation/bootstrap`;
  - do **not** merge;
  - leave concise `USER_DECISIONS_REQUIRED` only for true human gates.
- human_gate: NONE for draft PR/update; REQUIRED for merge/release/deploy.

---

## Global stop conditions

Claude Code must not cross these without a previously explicit approval:
- merge to `main` or `implementation/bootstrap`;
- mark a PR as approved/ready on behalf of the user;
- production/Vercel deploy or public release;
- tag/release/package publish;
- destructive migration or deleting user/project data;
- force-push/history rewrite;
- paid resource use or account creation;
- adding secrets/tokens to repository or logs;
- material change to PRD goals, approved interaction model, architecture hard boundaries, or IP guardrails.

If one task hits a stop condition, mark it `BLOCKED_HUMAN_GATE` and continue unrelated tasks.

## Morning success state

The ideal unattended result is:
- clean pushed nightly branch;
- dependency lockfile;
- green typecheck/unit/content/golden/build where environment permits;
- schema/registry + initial content;
- stronger deterministic battle core;
- save/persistence seam;
- React↔Phaser bridge;
- Tap-to-Move visible-enemy prototype;
- first mobile battle UI;
- Vertical Slice data skeleton;
- Draft PR and evidence report;
- no merge/deploy/release.
