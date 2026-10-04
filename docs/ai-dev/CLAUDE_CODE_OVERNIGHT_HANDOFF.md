# CLAUDE CODE OVERNIGHT EXECUTION HANDOFF

## Mission
Continue the foundation of `nanpsw-eng/three-kingdoms-web` unattended through the night. Do not wait for ordinary product or implementation confirmations. Use the approved repository PRD/ADRs/specs as authority, make only reversible low/medium-risk implementation choices, verify continuously, persist progress, and continue to the next independent task when one task is blocked.

## Start here
1. Clone/fetch `nanpsw-eng/three-kingdoms-web`.
2. Read, in order:
   - `AGENTS.md`
   - `docs/ai-dev/AI_OS_BINDING.md`
   - `docs/ai-dev/SESSION_HANDOFF.md`
   - `docs/product/PRD.md`
   - `docs/decisions/DECISION_INDEX.md`
   - `docs/specs/TECHNICAL_ARCHITECTURE.md`
   - `docs/ai-dev/OVERNIGHT_TASK_GRAPH.md`
3. Verify remote, branch, HEAD, working tree, Draft PR #1 and actual repository contents. Repository state overrides stale handoff text.
4. Fetch `origin/implementation/bootstrap`.
5. Create or resume branch `implementation/foundation-nightly` from the current `origin/implementation/bootstrap` HEAD. Do not modify `main`.
6. Use execution mode `SEQUENTIAL`, one writer. Do not spawn multiple writing agents against shared files/contracts.

## Autonomy rule
Do not ask the user to choose between routine implementation alternatives. When the approved specs allow multiple technical implementations, choose the **smallest, reversible, testable option** that preserves:
- mobile-first portrait UX;
- Tap-to-Move;
- Visible Encounter;
- max 5-person party;
- Smart Command;
- troop-based battle;
- fixed-identity character growth;
- Semi-open region exploration;
- TypeScript/Zod + JSON content;
- React UI / Phaser rendering / Pure TypeScript domain separation;
- deterministic seeded battle logic.

Record material technical choices in an ADR only when they are durable enough to deserve one.

If a product-level ambiguity cannot be resolved from PRD/specs:
- do not invent a new product decision;
- create the narrowest neutral seam/stub;
- record `BLOCKED_DECISION`;
- continue all independent work.

## Work plan
Execute `docs/ai-dev/OVERNIGHT_TASK_GRAPH.md` in dependency order:
`N0 → N1 → N2 → N3 → N4/N5 → N6 → N7 → N8 → N9 → N10 → N11`.

You may reorder only when dependencies allow and doing so reduces blocking.

## Verification discipline
At every green phase:
1. run the narrow tests first;
2. run the relevant broader gate;
3. inspect the diff;
4. commit the logical unit;
5. push the nightly branch;
6. continue.

Never report a test PASS unless it was actually executed with a successful exit status.

Prefer these repository commands, adding/fixing scripts as needed:
- `npm install` or `npm ci` when a lockfile exists
- `npm run test:domain`
- `npm run validate:content`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run test:e2e` when browser runtime is available
- final consolidated `npm run verify:foundation` or equivalent

Do not weaken tests merely to make them green.

## Retry / failure policy
For the same failure and same approach, maximum 2 attempts. On the second failure:
- preserve evidence;
- explain root cause;
- mark that task `BLOCKED`;
- proceed with independent tasks.

A clearly transient npm/network error may get one additional retry.
Do not repeatedly retry permissions, authentication, policy, secret, destructive migration, external account, or paid-resource failures.

## Git and commit rules
- Never force-push.
- Never rewrite shared history.
- Never merge.
- Never commit secrets, caches, generated dependency directories, screenshots with private data, or large disposable artifacts.
- Commit by logical phase, using clear messages.
- Push after each stable phase so progress survives session loss.
- Open/update a Draft PR from `implementation/foundation-nightly` to `implementation/bootstrap`.
- Do not mark the PR ready for review unless the final foundation gate is green; even then keep it Draft unless existing repository rules explicitly allow otherwise.
- Do not merge the PR.

## GitHub Actions
Default policy remains Actions OFF.

The user has conditionally preapproved a **validation-only** Actions policy change if it is actually necessary for unattended foundation verification. You may add a minimal workflow only if every condition in `OVERNIGHT_TASK_GRAPH.md` is satisfied. If you do:
- use only standard free runners on this public repository;
- validation only;
- no secrets;
- no deploy/release/publish;
- no paid/self-hosted runner;
- use PR and/or manual trigger;
- update ADR-004 and Handoff explaining why the override was necessary.

Otherwise do not create `.github/workflows/*`.

## Security / IP
- No copied Tenchi wo Kurau/Destiny of an Emperor sprites, portraits, maps, UI, music, dialogue, or proprietary data tables.
- Use simple procedural/placeholder visual assets created inside the project.
- No credentials or personal data.
- No Supabase/Auth/backend yet.

## Human gates — stop only the gated action, not the whole night
Do not perform:
- merge to main or integration/bootstrap;
- release/tag;
- production/Vercel deploy;
- destructive migration;
- history rewrite;
- paid resource/account creation;
- material PRD/architecture-policy change outside the conditional Actions exception.

When one is encountered, mark `BLOCKED_HUMAN_GATE` and continue independent tasks.

## Definition of overnight completion
Before ending:
1. inspect `git status` and all commits;
2. run the widest available foundation verification;
3. create/update `docs/reports/OVERNIGHT_FOUNDATION_REPORT.md`;
4. update `docs/ai-dev/SESSION_HANDOFF.md` following AI-OS Session Continuity Protocol;
5. push all committed work to `implementation/foundation-nightly`;
6. open/update Draft PR targeting `implementation/bootstrap`;
7. report:
   - final branch and HEAD;
   - commits by phase;
   - implemented items;
   - exact test commands/results;
   - PASS / FAIL / BLOCKED / NOT_RUN;
   - Actions state;
   - remaining risks;
   - true user decisions required.

Do not finish merely because one task fails. Continue until all independent READY tasks are exhausted or a hard environment limitation prevents all remaining work.
