import type { ContentRegistry } from '../content/registry';
import type { BattleRules, Combatant, Stats, FormationSpec, Side, TacticSpec, TraitEffect } from '../domain/battle/index';
import type { GeneralProgress } from '../domain/save/index';

/** Adapter: static content -> pure domain battle inputs. Domain never imports content/schemas. */

export function maxTroopsAt(registry: ContentRegistry, generalId: string, level: number): number {
  const general = requireRecord(registry.generals, generalId, 'general');
  return general.troopGrowth.baseTroop + general.troopGrowth.perLevel * Math.max(0, level - 1);
}

export function effectiveStatsAt(registry: ContentRegistry, generalId: string, level: number) {
  const general = requireRecord(registry.generals, generalId, 'general');
  const stats = { ...general.baseStats };
  for (const milestone of general.levelMilestones) {
    if (milestone.level > level) continue;
    for (const key of ['strength', 'intelligence', 'command', 'speed'] as const) {
      stats[key] = Math.min(100, stats[key] + (milestone.statBonuses[key] ?? 0));
    }
  }
  return stats;
}

/** DEC-005 BALANCE_PROPOSED: weapon attack scales with the wielder's listed aptitude grade. */
export const WEAPON_APTITUDE_MULTIPLIER = { S: 1.2, A: 1.1, B: 1, C: 0.8 } as const;

export interface EquipmentLoadout {
  weaponAttack: number;
  armorDefense: number;
  statBonuses: Partial<Stats>;
}

/** Equipped items -> derived combat numbers. Never persisted: re-derived from content on every use. */
export function equipmentLoadout(registry: ContentRegistry, generalId: string, equipment: GeneralProgress['equipment']): EquipmentLoadout {
  const general = requireRecord(registry.generals, generalId, 'general');
  const loadout: EquipmentLoadout = { weaponAttack: 0, armorDefense: 0, statBonuses: {} };
  if (equipment.weapon) {
    const weapon = requireRecord(registry.equipment, equipment.weapon, 'equipment');
    const grade = weapon.slot === 'WEAPON' ? general.weaponAptitudes[weapon.weaponType] : undefined;
    if (weapon.slot !== 'WEAPON' || !grade) throw new Error(`${generalId} cannot wield ${equipment.weapon}`);
    loadout.weaponAttack = Math.round(weapon.attack * WEAPON_APTITUDE_MULTIPLIER[grade]);
  }
  if (equipment.armor) {
    const armor = requireRecord(registry.equipment, equipment.armor, 'equipment');
    if (armor.slot !== 'ARMOR') throw new Error(`${equipment.armor} is not armor`);
    loadout.armorDefense = armor.defense;
  }
  if (equipment.accessory) {
    const accessory = requireRecord(registry.equipment, equipment.accessory, 'equipment');
    if (accessory.slot !== 'ACCESSORY') throw new Error(`${equipment.accessory} is not an accessory`);
    loadout.statBonuses = { ...accessory.statBonuses };
  }
  return loadout;
}

/** Level-derived stats plus accessory bonuses, each capped at 100. */
export function equippedStatsAt(registry: ContentRegistry, generalId: string, level: number, equipment: GeneralProgress['equipment']): Stats {
  const stats = effectiveStatsAt(registry, generalId, level);
  const { statBonuses } = equipmentLoadout(registry, generalId, equipment);
  for (const key of ['strength', 'intelligence', 'command', 'speed'] as const) {
    stats[key] = Math.min(100, stats[key] + (statBonuses[key] ?? 0));
  }
  return stats;
}

export function buildBattleRules(registry: ContentRegistry): BattleRules {
  const tactics: Record<string, TacticSpec> = {};
  for (const t of registry.tactics.values()) {
    const effect = t.effect.kind === 'STATUS'
      ? { kind: 'STATUS' as const, status: t.effect.status, durationTurns: t.effect.durationTurns, ...(t.effect.baseChance !== undefined ? { baseChance: t.effect.baseChance } : {}) }
      : t.effect;
    tactics[t.id] = { id: t.id, tpCost: t.tpCost, target: t.target, effect };
  }
  return { tactics };
}

export function formationSpec(registry: ContentRegistry, formationId: string): FormationSpec {
  const f = requireRecord(registry.formations, formationId, 'formation');
  return { id: f.id, party: f.party, slots: f.slots };
}

export interface GeneralCombatantOptions {
  side: Side;
  slot: number;
  level: number;
  /** Current troops; defaults to full. Persisted per save, never the static max. */
  troops?: number;
  weaponAttack?: number;
  armorDefense?: number;
  /** Player equipment; derives weapon/armor/stat values unless explicit numbers are given. */
  equipment?: GeneralProgress['equipment'];
  /** Learned tactics; defaults to the general's initial tactics. */
  tacticIds?: string[];
  /** Override combat id (e.g. two copies of a generic enemy). Defaults to general id. */
  combatId?: string;
}

export function combatantFromGeneral(registry: ContentRegistry, generalId: string, o: GeneralCombatantOptions): Combatant {
  const g = requireRecord(registry.generals, generalId, 'general');
  const maxTroops = maxTroopsAt(registry, generalId, o.level);
  const loadout = equipmentLoadout(registry, generalId, o.equipment ?? {});
  const traitEffects: TraitEffect[] = g.traitIds.flatMap((id) =>
    requireRecord(registry.traits, id, 'trait').effects.map((e) => stripUndefined(e) as TraitEffect),
  );
  return {
    id: o.combatId ?? g.id,
    side: o.side,
    stats: equippedStatsAt(registry, generalId, o.level, o.equipment ?? {}),
    unitType: g.unitType,
    level: o.level,
    weaponAttack: o.weaponAttack ?? loadout.weaponAttack,
    armorDefense: o.armorDefense ?? loadout.armorDefense,
    maxTroops,
    troops: Math.min(maxTroops, o.troops ?? maxTroops),
    slot: o.slot,
    statuses: [],
    traitEffects,
    tacticIds: [...(o.tacticIds ?? g.initialTacticIds)],
  };
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

function requireRecord<V>(map: ReadonlyMap<string, V>, id: string, kind: string): V {
  const v = map.get(id);
  if (!v) throw new Error(`unknown ${kind} ${id}`);
  return v;
}
