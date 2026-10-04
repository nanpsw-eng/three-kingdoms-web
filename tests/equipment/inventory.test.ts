import { describe, expect, it } from 'vitest';
import { combatantFromGeneral, equipmentLoadout, equippedStatsAt, effectiveStatsAt } from '../../src/game/battle/fromContent';
import { createSession, executeTurn } from '../../src/game/battle/session';
import { validateContent, type RawContentFile } from '../../src/game/content/registry';
import { dispatchTrigger } from '../../src/game/domain/progress/index';
import type { SaveGame } from '../../src/game/domain/save/index';
import {
  buyItem,
  canEquip,
  EquipmentError,
  equipItem,
  equippableFromInventory,
  shopAtCurrentLocation,
  unequipSlot,
} from '../../src/game/equipment/inventory';
import { decodeSave, encodeSave, SaveValidationError } from '../../src/game/persistence/saveCodec';
import { buildProgressContext } from '../../src/game/progress/fromContent';
import { createNewGame } from '../../src/game/save/newGame';
import { readContentFiles } from '../../scripts/contentFiles';

const files = readContentFiles();
const registry = validateContent(files).registry;
const NOW = '2026-10-04T00:00:00.000Z';

function started(): SaveGame {
  return dispatchTrigger(createNewGame(registry, NOW), buildProgressContext(registry), { type: 'GAME_START' }).save;
}

function code(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    return error instanceof EquipmentError ? error.code : String(error);
  }
  return undefined;
}

/** Each item is either in the inventory or equipped by exactly one general. */
function ownedCount(save: SaveGame, itemId: string): number {
  const equipped = Object.values(save.generals).filter((g) => Object.values(g.equipment).includes(itemId)).length;
  return (save.inventory[itemId] ?? 0) + equipped;
}

describe('equipment content (DEC-005)', () => {
  it('every SHOP location has a shop and every stocked item exists', () => {
    expect(validateContent(files).ok).toBe(true);
    expect(registry.equipment.size).toBeGreaterThanOrEqual(10);
    for (const shop of registry.shops.values()) for (const id of shop.itemIds) expect(registry.equipment.has(id)).toBe(true);
  });

  it('every playable recruit can wield at least one weapon sold in the Vertical Slice', () => {
    const sold = new Set([...registry.shops.values()].flatMap((s) => s.itemIds));
    for (const id of ['GEN_LIU_BEI', 'GEN_GUAN_YU', 'GEN_ZHANG_FEI', 'GEN_JIAN_YONG', 'GEN_FOREST_RECLUSE']) {
      const wieldable = [...sold].filter((itemId) => registry.equipment.get(itemId)?.slot === 'WEAPON' && canEquip(registry, id, itemId));
      expect(wieldable.length, id).toBeGreaterThan(0);
    }
  });

  it('registry rejects a shop on a location without a SHOP service and broken item references', () => {
    const broken: RawContentFile[] = files.map((f) =>
      f.path.endsWith('shops/vertical-slice.json')
        ? { ...f, data: [...(f.data as object[]), { id: 'SHOP_PLAIN', locationId: 'LOC_SOUTH_PLAIN', nameKey: 'shop.zhuo_town.name', itemIds: ['WPN_MISSING'] }] }
        : f,
    );
    const result = validateContent(broken);
    expect(result.ok).toBe(false);
    const messages = result.issues.map((i) => i.message).join('\n');
    expect(messages).toMatch(/does not offer a SHOP service/);
    expect(messages).toMatch(/WPN_MISSING not found/);
  });

  it('registry rejects an unknown weapon family in general aptitudes', () => {
    const broken: RawContentFile[] = files.map((f) =>
      f.path.endsWith('generals/guan-yu.json') ? { ...f, data: { ...(f.data as object), weaponAptitudes: { HALBERD: 'S' } } } : f,
    );
    expect(validateContent(broken).ok).toBe(false);
  });
});

describe('shop', () => {
  it('buys from the shop at the current location and spends gold', () => {
    const save = started();
    expect(shopAtCurrentLocation(save, registry)?.id).toBe('SHOP_ZHUO_TOWN');
    const after = buyItem(save, registry, 'WPN_IRON_DAO');
    expect(after.gold).toBe(save.gold - 60);
    expect(after.inventory).toEqual({ WPN_IRON_DAO: 1 });
    expect(save.inventory).toEqual({});
  });

  it('refuses insufficient gold, items not stocked here, and locations without a shop', () => {
    const save = started();
    expect(code(() => buyItem({ ...save, gold: 59 }, registry, 'WPN_IRON_DAO'))).toBe('NOT_ENOUGH_GOLD');
    expect(code(() => buyItem(save, registry, 'WPN_STEEL_DAO'))).toBe('NOT_SOLD_HERE');
    const plain = { ...save, world: { ...save.world, locationId: 'LOC_SOUTH_PLAIN' } };
    expect(shopAtCurrentLocation(plain, registry)).toBeNull();
    expect(code(() => buyItem(plain, registry, 'WPN_IRON_DAO'))).toBe('NO_SHOP_HERE');
  });
});

describe('equip / unequip', () => {
  it('moves items between inventory and slot, swapping the previous item back', () => {
    let save = { ...started(), gold: 1000 };
    save = buyItem(save, registry, 'WPN_IRON_DAO');
    save = buyItem(save, registry, 'WPN_IRON_SWORD');
    save = equipItem(save, registry, 'GEN_GUAN_YU', 'WPN_IRON_DAO');
    expect(save.generals.GEN_GUAN_YU!.equipment).toEqual({ weapon: 'WPN_IRON_DAO' });
    expect(save.inventory).toEqual({ WPN_IRON_SWORD: 1 });

    save = equipItem(save, registry, 'GEN_GUAN_YU', 'WPN_IRON_SWORD');
    expect(save.generals.GEN_GUAN_YU!.equipment).toEqual({ weapon: 'WPN_IRON_SWORD' });
    expect(save.inventory).toEqual({ WPN_IRON_DAO: 1 });

    save = unequipSlot(save, 'GEN_GUAN_YU', 'WEAPON');
    expect(save.generals.GEN_GUAN_YU!.equipment).toEqual({});
    expect(save.inventory).toEqual({ WPN_IRON_DAO: 1, WPN_IRON_SWORD: 1 });
    expect(ownedCount(save, 'WPN_IRON_DAO') + ownedCount(save, 'WPN_IRON_SWORD')).toBe(2);
  });

  it('enforces ownership, weapon aptitude, recruitment and non-empty slots', () => {
    let save = { ...started(), gold: 1000 };
    expect(code(() => equipItem(save, registry, 'GEN_GUAN_YU', 'WPN_IRON_DAO'))).toBe('NOT_OWNED');
    save = buyItem(save, registry, 'WPN_IRON_SWORD');
    // Zhang Fei lists SPEAR / AXE / DAO only.
    expect(code(() => equipItem(save, registry, 'GEN_ZHANG_FEI', 'WPN_IRON_SWORD'))).toBe('CANNOT_WIELD');
    expect(code(() => equipItem(save, registry, 'GEN_JIAN_YONG', 'WPN_IRON_SWORD'))).toBe('NOT_RECRUITED');
    expect(code(() => unequipSlot(save, 'GEN_LIU_BEI', 'ARMOR'))).toBe('SLOT_EMPTY');
    expect(equippableFromInventory(save, registry, 'GEN_ZHANG_FEI', 'WEAPON')).toEqual([]);
    expect(equippableFromInventory(save, registry, 'GEN_LIU_BEI', 'WEAPON').map((i) => i.id)).toEqual(['WPN_IRON_SWORD']);
  });

  it('equipped saves round-trip through the save schema; unknown ids are rejected', () => {
    let save = { ...started(), gold: 1000 };
    save = buyItem(save, registry, 'ARM_LEATHER');
    save = equipItem(save, registry, 'GEN_LIU_BEI', 'ARM_LEATHER');
    expect(decodeSave(JSON.parse(JSON.stringify(encodeSave(save))))).toEqual(save);
    const bad = { ...save, generals: { ...save.generals, GEN_LIU_BEI: { ...save.generals.GEN_LIU_BEI!, equipment: { weapon: 'ARM_LEATHER' } } } };
    expect(() => encodeSave(bad)).toThrow(SaveValidationError);
  });
});

describe('equipment -> battle', () => {
  it('weapon attack scales with aptitude grade; armor and accessory apply directly', () => {
    // Guan Yu: DAO S (x1.2), SPEAR B (x1.0).
    expect(equipmentLoadout(registry, 'GEN_GUAN_YU', { weapon: 'WPN_IRON_DAO' }).weaponAttack).toBe(7);
    expect(equipmentLoadout(registry, 'GEN_GUAN_YU', { weapon: 'WPN_IRON_SPEAR' }).weaponAttack).toBe(6);
    expect(equipmentLoadout(registry, 'GEN_GUAN_YU', { armor: 'ARM_LAMELLAR' }).armorDefense).toBe(8);
    const base = effectiveStatsAt(registry, 'GEN_LIU_BEI', 1);
    expect(equippedStatsAt(registry, 'GEN_LIU_BEI', 1, { accessory: 'ACC_BRONZE_TALLY' })).toEqual({ ...base, command: base.command + 2 });
    expect(() => equipmentLoadout(registry, 'GEN_ZHANG_FEI', { weapon: 'WPN_IRON_SWORD' })).toThrow(/cannot wield/);
  });

  it('caps accessory-boosted stats at 100', () => {
    const boosted = validateContent(files.map((f) =>
      f.path.endsWith('generals/guan-yu.json')
        ? { ...f, data: { ...(f.data as { baseStats: object }), baseStats: { ...(f.data as { baseStats: object }).baseStats, command: 99 } } }
        : f,
    )).registry;
    expect(equippedStatsAt(boosted, 'GEN_GUAN_YU', 1, { accessory: 'ACC_BRONZE_TALLY' }).command).toBe(100);
  });

  it('player combatants carry equipment; explicit numbers still override (enemy path)', () => {
    const c = combatantFromGeneral(registry, 'GEN_GUAN_YU', { side: 'PLAYER', slot: 0, level: 1, equipment: { weapon: 'WPN_IRON_DAO', armor: 'ARM_LEATHER' } });
    expect([c.weaponAttack, c.armorDefense]).toEqual([7, 4]);
    const e = combatantFromGeneral(registry, 'GEN_GUAN_YU', { side: 'ENEMY', slot: 0, level: 1, weaponAttack: 3, armorDefense: 2 });
    expect([e.weaponAttack, e.armorDefense]).toEqual([3, 2]);
  });

  it('same seed: equipped party deals at least as much first-turn damage, deterministically', () => {
    const party = (equipped: boolean) => ['GEN_LIU_BEI', 'GEN_GUAN_YU', 'GEN_ZHANG_FEI'].map((id) => ({
      generalId: id,
      level: 1,
      troops: 10_000,
      tacticIds: [],
      ...(equipped ? { equipment: { weapon: id === 'GEN_LIU_BEI' ? 'WPN_IRON_SWORD' : id === 'GEN_GUAN_YU' ? 'WPN_IRON_DAO' : 'WPN_IRON_SPEAR' } } : {}),
    }));
    const enemyTroops = (equipped: boolean) => {
      const { session } = executeTurn(createSession(registry, 'ENC_SOUTH_PLAIN_SCOUTS', party(equipped), 4242));
      return session.state.combatants.filter((c) => c.side === 'ENEMY').reduce((sum, c) => sum + c.troops, 0);
    };
    expect(enemyTroops(true)).toBeLessThan(enemyTroops(false));
    expect(enemyTroops(true)).toBe(enemyTroops(true));
  });
});
