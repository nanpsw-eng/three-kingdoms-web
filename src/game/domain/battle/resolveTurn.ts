import { BATTLE_CONFIG } from './config.js';
import { calculateHeal, calculatePhysicalDamage, calculateTacticDamage, controlChance } from './math.js';
import { effectiveSpeed, formationModifiers, hasStatus } from './modifiers.js';
import { determineOutcome, isAlive } from './outcome.js';
import { rollChance } from './rng.js';
import { recommendTarget, tauntersAgainst } from './smartCommand.js';
import type {
  BattleCommand,
  BattleEvent,
  BattleRules,
  BattleState,
  Combatant,
  StatusCode,
  TacticCommand,
  TacticSpec,
  TurnResult,
} from './types.js';

export const EMPTY_RULES: BattleRules = Object.freeze({ tactics: Object.freeze({}) });

function cloneState(state: BattleState): BattleState {
  return {
    ...state,
    combatants: state.combatants.map((c) => ({ ...c, stats: { ...c.stats }, statuses: c.statuses.map((s) => ({ ...s })) })),
    tp: { PLAYER: { ...state.tp.PLAYER }, ENEMY: { ...state.tp.ENEMY } },
    formations: { ...state.formations },
  };
}

function applyStatus(target: Combatant, code: StatusCode, turns: number): void {
  const existing = target.statuses.find((s) => s.code === code);
  if (existing) existing.remainingTurns = Math.max(existing.remainingTurns, turns);
  else target.statuses.push({ code, remainingTurns: turns });
}

/**
 * Deterministic turn resolution: same (state, commands, rules) => same result.
 * Input state is never mutated. One command per actor (first wins).
 */
export function resolveTurn(state: BattleState, commands: readonly BattleCommand[], rules: BattleRules = EMPTY_RULES): TurnResult {
  if (state.outcome !== 'ONGOING') return { state: cloneState(state), events: [] };

  const next = cloneState(state);
  const byId = new Map(next.combatants.map((c) => [c.id, c]));
  const events: BattleEvent[] = [];

  const seen = new Set<string>();
  const unique = commands.filter((c) => {
    if (seen.has(c.actorId) || !byId.has(c.actorId)) return false;
    seen.add(c.actorId);
    return true;
  });

  const defending = new Set(
    unique
      .filter((c) => c.type === 'DEFEND')
      .map((c) => byId.get(c.actorId)!)
      .filter((a) => isAlive(a) && !hasStatus(a, 'CONFUSED'))
      .map((a) => a.id),
  );

  const ordered = [...unique].sort((a, b) => {
    const delta = effectiveSpeed(next, byId.get(b.actorId)!) - effectiveSpeed(next, byId.get(a.actorId)!);
    return delta !== 0 ? delta : a.actorId.localeCompare(b.actorId);
  });

  let rngState = next.rngState;

  const dealDamage = (actor: Combatant, target: Combatant, amount: number, tacticId?: string): boolean => {
    target.troops = Math.max(0, target.troops - amount);
    events.push(tacticId ? { type: 'DAMAGE', actorId: actor.id, targetId: target.id, amount, tacticId } : { type: 'DAMAGE', actorId: actor.id, targetId: target.id, amount });
    if (target.troops === 0) {
      target.statuses = [];
      events.push({ type: 'ROUT', targetId: target.id });
    }
    const outcome = determineOutcome(next.combatants);
    if (outcome !== 'ONGOING') {
      next.outcome = outcome;
      events.push({ type: 'BATTLE_END', outcome });
      return true;
    }
    return false;
  };

  /** Resolve a hostile single target honoring taunt and routed-target retargeting. */
  const resolveEnemyTarget = (actor: Combatant, requestedId: string | undefined): Combatant | null => {
    const requested = requestedId ? byId.get(requestedId) : undefined;
    const taunters = tauntersAgainst(next, actor.side);
    if (taunters.length > 0 && !(requested && taunters.includes(requested))) {
      const to = taunters[0]!;
      if (requested) events.push({ type: 'TARGET_REDIRECTED', actorId: actor.id, fromId: requested.id, toId: to.id, reason: 'TAUNT' });
      return to;
    }
    if (requested && isAlive(requested) && requested.side !== actor.side) return requested;
    const fallback = recommendTarget(next, actor);
    if (fallback && requested) events.push({ type: 'TARGET_REDIRECTED', actorId: actor.id, fromId: requested.id, toId: fallback.id, reason: 'TARGET_ROUTED' });
    return fallback;
  };

  const runTactic = (actor: Combatant, command: TacticCommand): boolean => {
    const spec: TacticSpec | undefined = rules.tactics[command.tacticId];
    const fail = (reason: 'NO_TP' | 'UNKNOWN_TACTIC' | 'NOT_LEARNED' | 'INVALID_TARGET') => {
      events.push({ type: 'TACTIC_FAILED', actorId: actor.id, tacticId: command.tacticId, reason });
      return false;
    };
    if (!spec) return fail('UNKNOWN_TACTIC');
    if (!actor.tacticIds.includes(spec.id)) return fail('NOT_LEARNED');
    const tp = next.tp[actor.side];
    if (tp.current < spec.tpCost) return fail('NO_TP');

    let targets: Combatant[];
    switch (spec.target) {
      case 'SELF':
        targets = [actor];
        break;
      case 'ALL_ALLIES':
        targets = next.combatants.filter((c) => c.side === actor.side && isAlive(c));
        break;
      case 'ALL_ENEMIES':
        targets = next.combatants.filter((c) => c.side !== actor.side && isAlive(c));
        break;
      case 'SINGLE_ALLY': {
        const t = command.targetId ? byId.get(command.targetId) : undefined;
        if (!t || t.side !== actor.side || !isAlive(t)) return fail('INVALID_TARGET');
        targets = [t];
        break;
      }
      case 'SINGLE_ENEMY': {
        const t = resolveEnemyTarget(actor, command.targetId);
        if (!t) return fail('INVALID_TARGET');
        targets = [t];
        break;
      }
    }

    tp.current -= spec.tpCost;
    events.push({ type: 'TACTIC_CAST', actorId: actor.id, tacticId: spec.id, tpCost: spec.tpCost });
    const mods = formationModifiers(next, actor);

    for (const target of targets) {
      const effect = spec.effect;
      if (effect.kind === 'DAMAGE') {
        if (!isAlive(target)) continue;
        const result = calculateTacticDamage(actor, target, effect.power, rngState, defending.has(target.id), mods);
        rngState = result.nextRngState;
        if (dealDamage(actor, target, result.damage, spec.id)) return true;
      } else if (effect.kind === 'HEAL') {
        const amount = calculateHeal(actor, target, effect.power, mods);
        target.troops += amount;
        events.push({ type: 'HEAL', actorId: actor.id, targetId: target.id, amount, tacticId: spec.id });
      } else {
        const hostile = target.side !== actor.side;
        if (hostile && effect.baseChance !== undefined) {
          const chance = controlChance(actor, target, effect.baseChance);
          const roll = rollChance(rngState, chance);
          rngState = roll.nextState;
          if (!roll.success) {
            events.push({ type: 'STATUS_RESISTED', actorId: actor.id, targetId: target.id, status: effect.status, chance });
            continue;
          }
        }
        applyStatus(target, effect.status, effect.durationTurns);
        events.push({ type: 'STATUS_APPLIED', actorId: actor.id, targetId: target.id, status: effect.status, turns: effect.durationTurns });
      }
    }
    return false;
  };

  for (const command of ordered) {
    const actor = byId.get(command.actorId)!;
    if (!isAlive(actor)) continue;

    if (hasStatus(actor, 'CONFUSED')) {
      events.push({ type: 'ACTION_SKIPPED', actorId: actor.id, reason: 'CONFUSED' });
      continue;
    }

    if (command.type === 'DEFEND') {
      events.push({ type: 'DEFEND', actorId: actor.id });
      continue;
    }

    if (command.type === 'TACTIC') {
      if (runTactic(actor, command)) break;
      continue;
    }

    const target = resolveEnemyTarget(actor, command.targetId);
    if (!target) continue;
    const result = calculatePhysicalDamage(actor, target, rngState, defending.has(target.id), {
      attacker: formationModifiers(next, actor),
      defender: formationModifiers(next, target),
    });
    rngState = result.nextRngState;
    if (dealDamage(actor, target, result.damage)) break;
  }

  // End of turn: tick statuses, regenerate TP, advance turn, enforce turn cap.
  for (const c of next.combatants) {
    for (const s of c.statuses) s.remainingTurns -= 1;
    for (const s of c.statuses.filter((s) => s.remainingTurns <= 0)) events.push({ type: 'STATUS_EXPIRED', targetId: c.id, status: s.code });
    c.statuses = c.statuses.filter((s) => s.remainingTurns > 0);
  }
  for (const side of ['PLAYER', 'ENEMY'] as const) {
    const tp = next.tp[side];
    tp.current = Math.min(tp.max, tp.current + BATTLE_CONFIG.tp.regenPerTurn);
  }
  next.rngState = rngState;
  next.turn = state.turn + 1;
  if (next.outcome === 'ONGOING' && next.turn > BATTLE_CONFIG.maxTurns) {
    next.outcome = 'DRAW';
    events.push({ type: 'BATTLE_END', outcome: 'DRAW' });
  }

  return { state: next, events };
}
