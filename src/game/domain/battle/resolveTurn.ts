import { calculatePhysicalDamage } from './math.js';
import type { BattleCommand, BattleEvent, BattleState, Combatant, TurnResult } from './types.js';

function cloneCombatants(combatants: Combatant[]): Combatant[] {
  return combatants.map((c) => ({ ...c, stats: { ...c.stats } }));
}

export function resolveTurn(state: BattleState, commands: BattleCommand[]): TurnResult {
  const combatants = cloneCombatants(state.combatants);
  const byId = new Map(combatants.map((c) => [c.id, c]));
  const events: BattleEvent[] = [];
  const defending = new Set(
    commands.filter((c) => c.type === 'DEFEND').map((c) => c.actorId),
  );

  const ordered = [...commands].sort((a, b) => {
    const aSpeed = byId.get(a.actorId)?.stats.speed ?? -1;
    const bSpeed = byId.get(b.actorId)?.stats.speed ?? -1;
    return bSpeed - aSpeed || a.actorId.localeCompare(b.actorId);
  });

  let rngState = state.rngState;

  for (const command of ordered) {
    const actor = byId.get(command.actorId);
    if (!actor || actor.troops <= 0) continue;

    if (command.type === 'DEFEND') {
      events.push({ type: 'DEFEND', actorId: actor.id });
      continue;
    }

    const target = byId.get(command.targetId);
    if (!target || target.troops <= 0 || target.side === actor.side) continue;

    const result = calculatePhysicalDamage(actor, target, rngState, defending.has(target.id));
    rngState = result.nextRngState;
    target.troops = Math.max(0, target.troops - result.damage);
    events.push({ type: 'DAMAGE', actorId: actor.id, targetId: target.id, amount: result.damage });
    if (target.troops === 0) events.push({ type: 'ROUT', targetId: target.id });
  }

  return {
    state: {
      turn: state.turn + 1,
      rngState,
      combatants,
    },
    events,
  };
}
