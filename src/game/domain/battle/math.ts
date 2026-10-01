import type { Combatant, UnitType } from './types.js';
import { sampleRange } from './rng.js';

export interface DamageResult {
  damage: number;
  nextRngState: number;
}

export function troopFactor(troops: number, maxTroops: number): number {
  if (maxTroops <= 0 || troops <= 0) return 0;
  const ratio = troops / maxTroops;
  if (ratio >= 0.7) return 1;
  if (ratio >= 0.4) return 0.95;
  if (ratio >= 0.1) return 0.9;
  return 0.85;
}

export function unitModifier(attacker: UnitType, defender: UnitType): number {
  if (attacker === defender) return 1;
  const advantaged =
    (attacker === 'SPEAR' && defender === 'CAVALRY') ||
    (attacker === 'CAVALRY' && defender === 'ARCHER') ||
    (attacker === 'ARCHER' && defender === 'SPEAR');
  return advantaged ? 1.1 : 0.9;
}

export function calculatePhysicalDamage(
  attacker: Combatant,
  defender: Combatant,
  rngState: number,
  defenderIsDefending = false,
): DamageResult {
  const levelBonus = Math.max(0, attacker.level - 1);
  const defenseLevelBonus = Math.max(0, defender.level - 1);
  const attackScore = 40 + attacker.stats.strength * 1.6 + attacker.weaponAttack + levelBonus;
  const defenseScore = 30 + defender.stats.command * 1.2 + defender.armorDefense + defenseLevelBonus;
  const baseDamage = (2.4 * attackScore * attackScore) / (attackScore + defenseScore);
  const random = sampleRange(rngState, 0.95, 1.05);
  const defendModifier = defenderIsDefending ? 0.6 : 1;
  const raw =
    baseDamage *
    troopFactor(attacker.troops, attacker.maxTroops) *
    unitModifier(attacker.unitType, defender.unitType) *
    random.value *
    defendModifier;

  return {
    damage: Math.max(1, Math.round(raw)),
    nextRngState: random.nextState,
  };
}
