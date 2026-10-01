# DEC-002 — Defeat Recovery Policy

## Status
APPROVED — 2026-10-02

## Decision
When the player loses a normal battle:

1. Return the party to the most recent safe checkpoint / safe allied location represented by the save checkpoint model.
2. Restore each active-party general to **30% of maximum troops** (rounded using the implementation's normal integer rule, with a minimum of 1 troop).
3. Apply **no gold loss**.
4. Apply **no XP loss**.
5. The defeated encounter remains active unless a separate story/event rule explicitly changes it.

## Rationale
The mobile-first product should make defeat a retry/recovery event rather than a grinding tax. Returning at 1 troop would create mandatory recovery chores immediately after failure and conflicts with the short-session UX goal.

## Scope
This decision resolves former `BD-01` only.

Still open:
- `BD-02` level-up curve / XP table / tactic unlock schedule.
- `BD-03` retreat success/penalty rule.

## Implementation note
The current code still contains the pre-decision neutral seam until a verified implementation commit changes it. Do not treat this Decision record as evidence that code has already been updated.
