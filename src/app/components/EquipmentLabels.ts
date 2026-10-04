import type { EquipmentDefinition, EquipmentSlot } from '../../game/schemas';

export const SLOT_LABEL: Record<EquipmentSlot, string> = { WEAPON: '무기', ARMOR: '방어구', ACCESSORY: '장신구' };

const WEAPON_TYPE_LABEL: Record<string, string> = { SWORD: '검', DAO: '도', SPEAR: '창', BOW: '활', AXE: '부' };
const STAT_LABEL = { strength: '무력', intelligence: '지력', command: '통솔', speed: '속도' } as const;

export const STAT_KEYS = ['strength', 'intelligence', 'command', 'speed'] as const;
export const statLabel = (key: (typeof STAT_KEYS)[number]) => STAT_LABEL[key];

/** Short, color-independent effect summary, e.g. "공격 +6 · 도". */
export function effectSummary(item: EquipmentDefinition): string {
  switch (item.slot) {
    case 'WEAPON':
      return `공격 +${item.attack} · ${WEAPON_TYPE_LABEL[item.weaponType] ?? item.weaponType}`;
    case 'ARMOR':
      return `방어 +${item.defense}`;
    case 'ACCESSORY':
      return STAT_KEYS.filter((k) => item.statBonuses[k]).map((k) => `${STAT_LABEL[k]} +${item.statBonuses[k]}`).join(' · ');
  }
}
