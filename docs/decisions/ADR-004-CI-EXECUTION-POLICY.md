# ADR-004 — CI Execution Policy

- Status: `APPROVED WITH SCOPED VALIDATION OVERRIDE`
- Original Date: `2026-10-01`
- Scoped Override Date: `2026-10-02`
- Decision owner: User

## Context
The project originally selected local-first validation to avoid consuming GitHub-hosted Actions minutes. The repository is now public, so standard GitHub-hosted runner minutes are not the limiting factor. The user explicitly allowed the Actions-OFF policy to be changed when needed.

The current Chat execution surface can write GitHub content but cannot run the repository's npm/browser toolchain. A server-side validation check materially reduces the risk of accepting unverified TypeScript/content/E2E changes.

## Decision
Keep **local-first repository scripts** as the portable validation contract, but allow a narrowly scoped **GitHub Actions validation gate**.

Allowed workflow scope:
- pull requests targeting `implementation/bootstrap`, plus explicit `workflow_dispatch` when pre-PR/manual validation is needed;
- standard public GitHub-hosted runner only;
- `npm ci`, typecheck/content/unit/golden/build checks, and Chromium E2E;
- read-only repository permissions;
- no repository secrets;
- no deploy, release, tag, publish, external write, scheduled polling, paid runner, or self-hosted runner.

The workflow is validation evidence only. It does not authorize merge or release. Automatic feature-branch `push` triggering is intentionally disabled to avoid duplicate push + pull-request runs for the same SHA.

## Repository validation contract
Repository scripts remain authoritative and runnable outside Actions:
- `npm run check`
- `npm run verify:foundation`
- `npm run test:e2e`
- focused test scripts as added by features

A check may be recorded as `PASS` only when actual execution evidence is available. `NOT_RUN != PASS`.

## Human gates retained
- Merge to integration/main: explicit user approval.
- Production deploy, tag/release, package publishing: explicit user approval.
- Any workflow expansion beyond validation-only scope: explicit review under this ADR.

## Revisit triggers
- release/contributor workflow changes materially;
- CI cost or runtime becomes material;
- production deployment automation is proposed;
- a self-hosted or alternative CI runner is proposed.
