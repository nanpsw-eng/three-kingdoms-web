import { z } from 'zod';
import { AccessoryIdSchema, ArmorIdSchema, EquipmentIdSchema, LocalizationKeySchema, LocationIdSchema, ShopIdSchema, WeaponIdSchema, WeaponTypeSchema } from './ids';

const PriceSchema = z.number().int().min(1).max(100000);

/** Accessory stat bonuses share the milestone bonus range: small, identity-preserving nudges. */
const AccessoryBonusSchema = z.object({
  strength: z.number().int().min(0).max(5).optional(),
  intelligence: z.number().int().min(0).max(5).optional(),
  command: z.number().int().min(0).max(5).optional(),
  speed: z.number().int().min(0).max(5).optional(),
}).strict();

const EquipmentBase = {
  nameKey: LocalizationKeySchema,
  descriptionKey: LocalizationKeySchema,
  price: PriceSchema,
};

/** DEC-005: one item per slot; values are BALANCE_PROPOSED content, not engine constants. */
export const EquipmentSchema = z.discriminatedUnion('slot', [
  z.object({ id: WeaponIdSchema, slot: z.literal('WEAPON'), weaponType: WeaponTypeSchema, attack: z.number().int().min(1).max(100), ...EquipmentBase }).strict(),
  z.object({ id: ArmorIdSchema, slot: z.literal('ARMOR'), defense: z.number().int().min(1).max(100), ...EquipmentBase }).strict(),
  z.object({ id: AccessoryIdSchema, slot: z.literal('ACCESSORY'), statBonuses: AccessoryBonusSchema, ...EquipmentBase }).strict(),
]);

export const ShopSchema = z.object({
  id: ShopIdSchema,
  /** The location whose SHOP service opens this shop. */
  locationId: LocationIdSchema,
  nameKey: LocalizationKeySchema,
  itemIds: z.array(EquipmentIdSchema).min(1),
}).strict();

export type EquipmentDefinition = z.infer<typeof EquipmentSchema>;
export type EquipmentSlot = EquipmentDefinition['slot'];
export type ShopDefinition = z.infer<typeof ShopSchema>;
