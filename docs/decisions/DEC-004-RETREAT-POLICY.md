# DEC-004 — Retreat Policy

## Status
APPROVED / IMPLEMENTED — 2026-10-02

## Rule
- If an encounter has `canRetreat=true`, retreat succeeds **100% deterministically**.
- Retreat immediately ends the battle with result `RETREAT`.
- Current surviving troops are persisted.
- No gold or XP is awarded or lost.
- The encounter remains active.
- Boss encounters must have `canRetreat=false`.
- A non-boss story encounter may also explicitly set `canRetreat=false`.

## Rationale
Random retreat failure adds repeated-input friction without adding meaningful strategy to the mobile-first Vertical Slice. Encounter data remains the authority for whether retreat is permitted at all.

## Implementation
- `BattleSession.retreat()` already returns deterministic `RETREAT` for allowed encounters.
- Encounter schema now rejects bosses with `canRetreat=true`.
- Save folding preserves troops and gives no rewards on retreat.

## Approval / integration gate
The retreat policy is approved and integrated into `implementation/bootstrap` by PR #8.
