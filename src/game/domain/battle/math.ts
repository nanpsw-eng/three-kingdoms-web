import { BATTLE_CONFIG } from './config.js';
import { NEUTRAL_MODIFIERS, hasStatus, traitBonus, traitMultiplier } from './modifiers.js';
import { sampleRange } from './rng.js';
import type { Combatant, ModifierSet, UnitType } from './types.js';

export interface DamageResult {
  damage: number;
  nextRngState: number;
}

export function troopFactor(troops: number, maxTroops: number): number {
  if (maxTroops <= 0 || troops <= 0) return 0;
  const ratio = troops / maxTroops;
  for (const band of BATTLE_CONFIG.troopBands) if (ratio >= band.atLeast) return band.factor;
  return 0;
}

export function unitModifier(attacker: UnitType, defender: UnitType): number {
  if (attacker === defender) return 1;
  const advantaged =
    (attacker === 'SPEAR' && defender === 'CAVALRY') ||
    (attacker === 'CAVALRY' && defender === 'ARCHER') ||
    (attacker === 'ARCHER' && defender === 'SPEAR');
  return advantaged ? BATTLE_CONFIG.unit.advantage : BATTLE_CONFIG.unit.disadvantage;
}

export interface DamageModifiers {
  attacker?: ModifierSet;
  defender?: ModifierSet;
}

/**
 * Physical damage. With neutral formation/trait/status modifiers this is
 * bit-identical to the v0.1 formula (guarded by golden tests).
 */
export function calculatePhysicalDamage(
  attacker: Combatant,
  defender: Combatant,
  rngState: number,
  defenderIsDefending = false,
  modifiers: DamageModifiers = {},
): DamageResult {
  const p = BATTLE_CONFIG.physical;
  const levelBonus = Math.max(0, attacker.level - 1);
  const defenseLevelBonus = Math.max(0, defender.level - 1);
  const attackScore = p.attackBase + attacker.stats.strength * p.strengthCoef + attacker.weaponAttack + levelBonus;
  const defenseScore = p.defenseBase + defender.stats.command * p.commandCoef + defender.armorDefense + defenseLevelBonus;
  const baseDamage = (p.scale * attackScore * attackScore) / (attackScore + defenseScore);
  const random = sampleRange(rngState, BATTLE_CONFIG.random.min, BATTLE_CONFIG.random.max);
  const defendModifier = defenderIsDefending ? BATTLE_CONFIG.defend.damageTakenMultiplier : 1;
  const atk = modifiers.attacker ?? NEUTRAL_MODIFIERS;
  const def = modifiers.defender ?? NEUTRAL_MODIFIERS;
  const raw =
    baseDamage *
    troopFactor(attacker.troops, attacker.maxTroops) *
    unitModifier(attacker.unitType, defender.unitType) *
    random.value *
    defendModifier *
    (atk.physicalAttack / def.physicalDefense) *
    traitMultiplier(attacker, 'PHYSICAL_DAMAGE_MULTIPLIER') *
    traitMultiplier(defender, 'DAMAGE_TAKEN_MULTIPLIER') *
    (hasStatus(attacker, 'INSPIRED') ? BATTLE_CONFIG.status.inspiredPhysicalMultiplier : 1);

  return {
    damage: Math.max(BATTLE_CONFIG.minDamage, Math.round(raw)),
    nextRngState: random.nextState,
  };
}

/** Intelligence-based tactic damage. Not reduced by troop ratio or unit matchup. */
export function calculateTacticDamage(
  caster: Combatant,
  target: Combatant,
  power: number,
  rngState: number,
  targetIsDefending = false,
  casterModifiers: ModifierSet = NEUTRAL_MODIFIERS,
): DamageResult {
  const t = BATTLE_CONFIG.tactic;
  const attackScore = t.attackBase + caster.stats.intelligence * t.intelligenceCoef;
  const resistScore = t.resistBase + target.stats.intelligence * t.resistIntelligenceCoef + target.stats.command * t.resistCommandCoef;
  const baseDamage = (t.scale * power * attackScore * attackScore) / (attackScore + resistScore);
  const random = sampleRange(rngState, BATTLE_CONFIG.random.min, BATTLE_CONFIG.random.max);
  const raw =
    baseDamage *
    random.value *
    (targetIsDefending ? BATTLE_CONFIG.defend.damageTakenMultiplier : 1) *
    casterModifiers.tacticPower *
    traitMultiplier(caster, 'TACTIC_DAMAGE_MULTIPLIER') *
    traitMultiplier(target, 'DAMAGE_TAKEN_MULTIPLIER');
  return { damage: Math.max(BATTLE_CONFIG.minDamage, Math.round(raw)), nextRngState: random.nextState };
}

/** Deterministic heal amount (no RNG), capped by missing troops. */
export function calculateHeal(caster: Combatant, target: Combatant, power: number, casterModifiers: ModifierSet = NEUTRAL_MODIFIERS): number {
  const h = BATTLE_CONFIG.heal;
  const raw = (h.base + caster.stats.intelligence * h.intelligenceCoef) * power * casterModifiers.tacticPower * traitMultiplier(caster, 'HEAL_POWER_MULTIPLIER');
  return Math.max(0, Math.min(target.maxTroops - target.troops, Math.round(raw)));
}

/** Control success chance, clamped to the configured bounds. */
export function controlChance(caster: Combatant, target: Combatant, baseChance: number): number {
  const c = BATTLE_CONFIG.control;
  const raw = baseChance + (caster.stats.intelligence - target.stats.intelligence) * c.intelligenceDeltaCoef + traitBonus(caster, 'CONTROL_SUCCESS_BONUS');
  return Math.min(c.maxChance, Math.max(c.minChance, raw));
}
