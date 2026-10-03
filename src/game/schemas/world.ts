import { z } from 'zod';
import { EncounterIdSchema, FlagIdSchema, LocalizationKeySchema, LocationIdSchema, NpcIdSchema, RegionIdSchema } from './ids';

export const ContentStatusSchema = z.enum(['APPROVED', 'PROVISIONAL_CONTENT_REVIEW_REQUIRED']);
export const FactionSchema = z.enum(['PLAYER', 'YELLOW_TURBAN', 'HAN', 'NEUTRAL']);

export const RegionSchema = z.object({
  id: RegionIdSchema,
  nameKey: LocalizationKeySchema,
  /** Region is hidden until this flag is true; null = open from the start. */
  unlockFlag: FlagIdSchema.nullable(),
  contentStatus: ContentStatusSchema.optional(),
}).strict();

export const LocationSchema = z.object({
  id: LocationIdSchema,
  regionId: RegionIdSchema,
  nameKey: LocalizationKeySchema,
  type: z.enum(['CITY', 'VILLAGE', 'FIELD', 'FOREST', 'DUNGEON', 'FORT', 'GATE', 'BATTLEFIELD', 'SECRET']),
  initialOwner: FactionSchema,
  /** Undirected travel links to neighbouring locations. */
  connections: z.array(LocationIdSchema),
  /** Field encounters; each is active while its `activeUnlessFlag` (if any) is not set. */
  encounters: z.array(z.object({ encounterId: EncounterIdSchema, activeUnlessFlag: FlagIdSchema.optional() }).strict()),
  /** Services available while the player owns the location (e.g. captured outpost becomes a recovery point). */
  servicesWhenOwned: z.array(z.enum(['REST', 'SHOP', 'SAVE_POINT'])).default([]),
  services: z.array(z.enum(['REST', 'SHOP', 'SAVE_POINT'])).default([]),
  contentStatus: ContentStatusSchema.optional(),
}).strict();

export const NpcSchema = z.object({
  id: NpcIdSchema,
  nameKey: LocalizationKeySchema,
  locationId: LocationIdSchema,
  /** Short placeholder line key; real dialogue is out of scope until content review. */
  lineKey: LocalizationKeySchema,
  contentStatus: ContentStatusSchema.optional(),
}).strict();

export const FlagSchema = z.object({
  id: FlagIdSchema,
  description: z.string().min(1),
}).strict();

export type RegionDefinition = z.infer<typeof RegionSchema>;
export type LocationDefinition = z.infer<typeof LocationSchema>;
export type NpcDefinition = z.infer<typeof NpcSchema>;
export type FlagDefinition = z.infer<typeof FlagSchema>;
