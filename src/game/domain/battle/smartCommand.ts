import type { AttackCommand, BattleCommand, BattleState, Combatant, Side } from './types.js';
import { unitModifier } from './math.js';

function livingEnemies(state: BattleState, side: Side): Combatant[] {
  return state.combatants.filter((c) => c.side !== side && c.troops > 0);
}

function targetScore(actor: Combatant, target: Combatant): number {
  const missingTroopRatio = 1 - target.troops / target.maxTroops;
  const matchup = unitModifier(actor.unitType, target.unitType) - 1;
  return missingTroopRatio * 100 + matchup * 40 - target.troops / 100000;
}

export function recommendAttack(state: BattleState, actorId: string): AttackCommand | null {
  const actor = state.combatants.find((c) => c.id === actorId && c.troops > 0);
  if (!actor) return null;
  const enemies = livingEnemies(state, actor.side);
  if (enemies.length === 0) return null;
  const ranked = [...enemies].sort((a, b) => {
    const delta = targetScore(actor, b) - targetScore(actor, a);
    return delta !== 0 ? delta : a.id.localeCompare(b.id);
  });
  const target = ranked[0];
  return target ? { type: 'ATTACK', actorId: actor.id, targetId: target.id } : null;
}

export function buildSmartCommands(state: BattleState, side: Side): BattleCommand[] {
  return state.combatants
    .filter((c) => c.side === side && c.troops > 0)
    .map((c) => recommendAttack(state, c.id))
    .filter((command): command is AttackCommand => command !== null);
}
