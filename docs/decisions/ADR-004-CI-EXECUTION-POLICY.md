# ADR-004 — CI Execution Policy

- Status: `APPROVED`
- Date: `2026-10-01`
- Decision owner: User

## Context
The project originally selected local-first validation to avoid consuming GitHub-hosted Actions minutes. The repository is now public, which removes standard hosted-runner minute charges, but the approved initial workflow remains local/Codex-first until explicitly reopened.

## Decision
Adopt **`LOCAL_FIRST / GITHUB_ACTIONS_DISABLED`** for the initial development phase.

- GitHub stores code, docs, branches, commits and review history.
- Do **not** create or enable `.github/workflows/*` by default.
- Validation commands must live in repository scripts so they can run identically in local environments, Codex, or a later CI provider.
- Expected scripts will cover, as applicable: typecheck, lint, unit tests, content/schema/reference validation, deterministic battle/golden tests, build and mobile E2E.
- Verification state is based on observed execution evidence only. `NOT_RUN != PASS`.

## Revisit triggers
- release frequency or contributor count makes manual/local validation unreliable;
- a release gate requires server-side independent CI;
- the user explicitly chooses to use free standard Actions available to this public repository;
- a self-hosted or alternative CI runner is deliberately adopted.

Any production release remains subject to the existing Human Approval Gate.
