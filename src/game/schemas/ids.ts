import { z } from 'zod';

/** Stable ID schemas. Prefixes follow docs/specs/GAME_DATA_SCHEMA.md. */
const prefixed = (prefix: string) => z.string().regex(new RegExp(`^${prefix}_[A-Z0-9_]+$`), `expected ${prefix}_* id`);

export const GeneralIdSchema = prefixed('GEN');
export const UnitTypeIdSchema = prefixed('UNIT');
export const TraitIdSchema = prefixed('TRT');
export const TacticIdSchema = prefixed('TAC');
export const FormationIdSchema = prefixed('FORM');
export const RegionIdSchema = prefixed('REG');
export const LocationIdSchema = prefixed('LOC');
export const EncounterIdSchema = prefixed('ENC');
export const EnemyIdSchema = prefixed('ENEMY');
export const QuestIdSchema = prefixed('QST');
export const EventIdSchema = prefixed('EVT');
export const FlagIdSchema = prefixed('FLAG');
export const NpcIdSchema = prefixed('NPC');
export const WeaponIdSchema = prefixed('WPN');
export const ArmorIdSchema = prefixed('ARM');
export const AccessoryIdSchema = prefixed('ACC');
export const EquipmentIdSchema = z.union([WeaponIdSchema, ArmorIdSchema, AccessoryIdSchema]);
export const ShopIdSchema = prefixed('SHOP');

export const LocalizationKeySchema = z.string().regex(/^[a-z0-9_]+(\.[a-z0-9_]+)+$/, 'expected dotted lowercase localization key');

/** Unit type codes are the domain-level enum used by the battle core. */
export const UnitTypeCodeSchema = z.enum(['SPEAR', 'CAVALRY', 'ARCHER']);

/** Weapon families; general `weaponAptitudes` keys and weapon `weaponType` share this vocabulary. */
export const WeaponTypeSchema = z.enum(['SWORD', 'DAO', 'SPEAR', 'BOW', 'AXE']);
export const WeaponAptitudeSchema = z.enum(['S', 'A', 'B', 'C']);
