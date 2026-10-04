import type { ContentRegistry } from '../content/registry';
import type { GeneralProgress, SaveGame } from '../domain/save/index';
import type { EquipmentDefinition, EquipmentSlot, ShopDefinition } from '../schemas';
import { WEAPON_APTITUDE_MULTIPLIER } from '../battle/fromContent';
import { effectiveLocationServices } from '../world/interaction';

/**
 * Shop and equipment adapter (DEC-005). Pure save -> save transitions over static content.
 * Owned-but-unequipped items live in `save.inventory`; equipped items live only in
 * `generals[id].equipment`, so each physical item is counted exactly once.
 */

type EquipmentKey = keyof GeneralProgress['equipment'];

export const SLOT_KEY: Record<EquipmentSlot, EquipmentKey> = { WEAPON: 'weapon', ARMOR: 'armor', ACCESSORY: 'accessory' };

export type EquipmentErrorCode =
  | 'NO_SHOP_HERE'
  | 'NOT_SOLD_HERE'
  | 'NOT_ENOUGH_GOLD'
  | 'UNKNOWN_ITEM'
  | 'NOT_RECRUITED'
  | 'NOT_OWNED'
  | 'CANNOT_WIELD'
  | 'SLOT_EMPTY';

export class EquipmentError extends Error {
  constructor(readonly code: EquipmentErrorCode, message: string) {
    super(message);
    this.name = 'EquipmentError';
  }
}

function itemOrThrow(registry: ContentRegistry, itemId: string): EquipmentDefinition {
  const item = registry.equipment.get(itemId);
  if (!item) throw new EquipmentError('UNKNOWN_ITEM', `unknown equipment ${itemId}`);
  return item;
}

function withCount(inventory: Record<string, number>, itemId: string, delta: number): Record<string, number> {
  const next = { ...inventory };
  const count = (next[itemId] ?? 0) + delta;
  if (count < 0) throw new EquipmentError('NOT_OWNED', `${itemId} is not in the inventory`);
  if (count === 0) delete next[itemId];
  else next[itemId] = count;
  return next;
}

/** The shop open at the player's current location, if its SHOP service is currently available. */
export function shopAtCurrentLocation(save: SaveGame, registry: ContentRegistry): ShopDefinition | null {
  const locationId = save.world.locationId;
  if (!locationId || !effectiveLocationServices(save, registry, locationId).includes('SHOP')) return null;
  return [...registry.shops.values()].find((shop) => shop.locationId === locationId) ?? null;
}

export function buyItem(save: SaveGame, registry: ContentRegistry, itemId: string): SaveGame {
  const shop = shopAtCurrentLocation(save, registry);
  if (!shop) throw new EquipmentError('NO_SHOP_HERE', 'no shop at the current location');
  if (!shop.itemIds.includes(itemId)) throw new EquipmentError('NOT_SOLD_HERE', `${shop.id} does not sell ${itemId}`);
  const item = itemOrThrow(registry, itemId);
  if (save.gold < item.price) throw new EquipmentError('NOT_ENOUGH_GOLD', `${itemId} costs ${item.price}, have ${save.gold}`);
  return { ...save, gold: save.gold - item.price, inventory: withCount(save.inventory, itemId, 1) };
}

/** Weapons require a listed aptitude for their family; armor and accessories fit anyone. */
export function canEquip(registry: ContentRegistry, generalId: string, itemId: string): boolean {
  const general = registry.generals.get(generalId);
  const item = registry.equipment.get(itemId);
  if (!general || !item) return false;
  return item.slot !== 'WEAPON' || general.weaponAptitudes[item.weaponType] !== undefined;
}

export function weaponAptitudeOf(registry: ContentRegistry, generalId: string, itemId: string): keyof typeof WEAPON_APTITUDE_MULTIPLIER | null {
  const item = registry.equipment.get(itemId);
  if (!item || item.slot !== 'WEAPON') return null;
  return registry.generals.get(generalId)?.weaponAptitudes[item.weaponType] ?? null;
}

export function equipItem(save: SaveGame, registry: ContentRegistry, generalId: string, itemId: string): SaveGame {
  const progress = save.generals[generalId];
  if (!progress) throw new EquipmentError('NOT_RECRUITED', `${generalId} has not joined`);
  const item = itemOrThrow(registry, itemId);
  if ((save.inventory[itemId] ?? 0) < 1) throw new EquipmentError('NOT_OWNED', `${itemId} is not in the inventory`);
  if (!canEquip(registry, generalId, itemId)) throw new EquipmentError('CANNOT_WIELD', `${generalId} cannot use ${itemId}`);
  const key = SLOT_KEY[item.slot];
  const previous = progress.equipment[key];
  let inventory = withCount(save.inventory, itemId, -1);
  if (previous) inventory = withCount(inventory, previous, 1);
  return {
    ...save,
    inventory,
    generals: { ...save.generals, [generalId]: { ...progress, equipment: { ...progress.equipment, [key]: itemId } } },
  };
}

export function unequipSlot(save: SaveGame, generalId: string, slot: EquipmentSlot): SaveGame {
  const progress = save.generals[generalId];
  if (!progress) throw new EquipmentError('NOT_RECRUITED', `${generalId} has not joined`);
  const key = SLOT_KEY[slot];
  const current = progress.equipment[key];
  if (!current) throw new EquipmentError('SLOT_EMPTY', `${generalId} has nothing in ${slot}`);
  const equipment = { ...progress.equipment };
  delete equipment[key];
  return {
    ...save,
    inventory: withCount(save.inventory, current, 1),
    generals: { ...save.generals, [generalId]: { ...progress, equipment } },
  };
}

/** Unequipped items the general could put in `slot`, in content order. */
export function equippableFromInventory(save: SaveGame, registry: ContentRegistry, generalId: string, slot: EquipmentSlot): EquipmentDefinition[] {
  return [...registry.equipment.values()].filter(
    (item) => item.slot === slot && (save.inventory[item.id] ?? 0) > 0 && canEquip(registry, generalId, item.id),
  );
}
