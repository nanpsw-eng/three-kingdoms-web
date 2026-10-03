import { unitModifier } from './math.js';
import { hasStatus } from './modifiers.js';
import type { AttackCommand, BattleCommand, BattleRules, BattleState, Combatant, Side } from './types.js';

function livingEnemies(state: Pick<BattleState, 'combatants'>, side: Side): Combatant[] {
  return state.combatants.filter((c) => c.side !== side && c.troops > 0);
}

function targetScore(actor: Combatant, target: Combatant): number {
  const missingTroopRatio = 1 - target.troops / target.maxTroops;
  const matchup = unitModifier(actor.unitType, target.unitType) - 1;
  return missingTroopRatio * 100 + matchup * 40 - target.troops / 100000;
}

/** Living taunting enemies, ordered deterministically (slot, id). */
export function tauntersAgainst(state: Pick<BattleState, 'combatants'>, side: Side): Combatant[] {
  return livingEnemies(state, side)
    .filter((c) => hasStatus(c, 'TAUNTING'))
    .sort((a, b) => a.slot - b.slot || a.id.localeCompare(b.id));
}

/** Recommended target: taunters take priority; otherwise weakest/best-matchup enemy. */
export function recommendTarget(state: Pick<BattleState, 'combatants'>, actor: Combatant): Combatant | null {
  const taunters = tauntersAgainst(state, actor.side);
  const pool = taunters.length > 0 ? taunters : livingEnemies(state, actor.side);
  const ranked = [...pool].sort((a, b) => {
    const delta = targetScore(actor, b) - targetScore(actor, a);
    return delta !== 0 ? delta : a.id.localeCompare(b.id);
  });
  return ranked[0] ?? null;
}

export function recommendAttack(state: Pick<BattleState, 'combatants'>, actorId: string): AttackCommand | null {
  const actor = state.combatants.find((c) => c.id === actorId && c.troops > 0);
  if (!actor) return null;
  const target = recommendTarget(state, actor);
  return target ? { type: 'ATTACK', actorId: actor.id, targetId: target.id } : null;
}

/** Smart Command: every living general on `side` defaults to a recommended basic attack. */
export function buildSmartCommands(state: Pick<BattleState, 'combatants'>, side: Side): BattleCommand[] {
  return state.combatants
    .filter((c) => c.side === side && c.troops > 0)
    .map((c) => recommendAttack(state, c.id))
    .filter((command): command is AttackCommand => command !== null);
}

/** Replace (or add) the command for one actor; other commands are untouched. */
export function applyCommandOverride(commands: readonly BattleCommand[], override: BattleCommand): BattleCommand[] {
  const replaced = commands.map((c) => (c.actorId === override.actorId ? override : c));
  return replaced.some((c) => c === override) ? replaced : [...replaced, override];
}

/** All-Attack: discard overrides, every living general attacks its recommended target. */
export function buildAllAttackCommands(state: Pick<BattleState, 'combatants'>, side: Side): BattleCommand[] {
  return buildSmartCommands(state, side);
}

/**
 * Repeat: reuse last turn's commands for still-living actors. Tactics that can no
 * longer be paid fall back to a basic attack; routed targets are left to
 * resolveTurn's deterministic retargeting. New living actors get Smart Commands.
 */
export function buildRepeatCommands(
  state: BattleState,
  side: Side,
  previous: readonly BattleCommand[],
  rules: BattleRules,
): BattleCommand[] {
  let tpLeft = state.tp[side].current;
  const result: BattleCommand[] = [];
  for (const actor of state.combatants.filter((c) => c.side === side && c.troops > 0)) {
    const prior = previous.find((c) => c.actorId === actor.id);
    if (prior?.type === 'TACTIC') {
      const cost = rules.tactics[prior.tacticId]?.tpCost ?? Infinity;
      if (cost <= tpLeft) {
        tpLeft -= cost;
        result.push(prior);
        continue;
      }
    } else if (prior) {
      result.push(prior);
      continue;
    }
    const fallback = recommendAttack(state, actor.id);
    if (fallback) result.push(fallback);
  }
  return result;
}
