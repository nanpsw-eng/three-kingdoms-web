import { BATTLE_CONFIG } from './config.js';
import type { BattleState, Combatant, ModifierSet, StatusCode, TraitCondition, TraitEffect } from './types.js';

export const NEUTRAL_MODIFIERS: ModifierSet = Object.freeze({ physicalAttack: 1, physicalDefense: 1, tacticPower: 1, speed: 1 });

/** Party x slot formation modifiers for a combatant. Neutral when no formation is set. */
export function formationModifiers(state: Pick<BattleState, 'formations'>, combatant: Combatant): ModifierSet {
  const formation = state.formations[combatant.side];
  if (!formation) return NEUTRAL_MODIFIERS;
  const slot = formation.slots[combatant.slot] ?? NEUTRAL_MODIFIERS;
  return {
    physicalAttack: formation.party.physicalAttack * slot.physicalAttack,
    physicalDefense: formation.party.physicalDefense * slot.physicalDefense,
    tacticPower: formation.party.tacticPower * slot.tacticPower,
    speed: formation.party.speed * slot.speed,
  };
}

function conditionHolds(combatant: Combatant, condition: TraitCondition | undefined): boolean {
  if (!condition) return true;
  const ratio = combatant.maxTroops > 0 ? combatant.troops / combatant.maxTroops : 0;
  if (condition.selfTroopRatioAtLeast !== undefined && ratio < condition.selfTroopRatioAtLeast) return false;
  if (condition.selfTroopRatioBelow !== undefined && ratio >= condition.selfTroopRatioBelow) return false;
  return true;
}

type MultiplierType = Exclude<TraitEffect['type'], 'CONTROL_SUCCESS_BONUS'>;

/** Product of all matching multiplier trait effects whose condition holds. */
export function traitMultiplier(combatant: Combatant, type: MultiplierType): number {
  let result = 1;
  for (const effect of combatant.traitEffects) {
    if (effect.type === type && conditionHolds(combatant, effect.condition)) result *= effect.value;
  }
  return result;
}

export function traitBonus(combatant: Combatant, type: 'CONTROL_SUCCESS_BONUS'): number {
  let result = 0;
  for (const effect of combatant.traitEffects) if (effect.type === type) result += effect.value;
  return result;
}

export function hasStatus(combatant: Combatant, code: StatusCode): boolean {
  return combatant.statuses.some((s) => s.code === code && s.remainingTurns > 0);
}

export function effectiveSpeed(state: Pick<BattleState, 'formations'>, combatant: Combatant): number {
  return combatant.stats.speed * formationModifiers(state, combatant).speed;
}

export function partyTpMax(combatants: readonly Combatant[], side: Combatant['side']): number {
  const best = Math.max(0, ...combatants.filter((c) => c.side === side).map((c) => c.stats.intelligence));
  return Math.round(BATTLE_CONFIG.tp.base + best * BATTLE_CONFIG.tp.bestIntelligenceCoef);
}
