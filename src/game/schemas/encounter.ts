import { z } from 'zod';
import { EncounterIdSchema, FormationIdSchema, GeneralIdSchema, LocalizationKeySchema } from './ids';

export const EncounterEnemySchema = z.object({
  generalId: GeneralIdSchema,
  level: z.number().int().min(1).max(99),
  slot: z.number().int().min(0).max(4),
  /** Unique combat id when the same general record appears more than once. */
  combatId: z.string().regex(/^[A-Z0-9_]+$/).optional(),
  weaponAttack: z.number().int().min(0).max(100).default(0),
  armorDefense: z.number().int().min(0).max(100).default(0),
  /** Troop override (e.g. under-strength garrison); defaults to full for the level. */
  troops: z.number().int().positive().optional(),
}).strict();

export const EncounterSchema = z.object({
  id: EncounterIdSchema,
  nameKey: LocalizationKeySchema,
  enemies: z.array(EncounterEnemySchema).min(1).max(5),
  enemyFormationId: FormationIdSchema.nullable().default(null),
  isBoss: z.boolean().default(false),
  canRetreat: z.boolean().default(true),
  rewards: z.object({ xp: z.number().int().min(0), gold: z.number().int().min(0) }).strict(),
  contentStatus: z.enum(['APPROVED', 'PROVISIONAL_CONTENT_REVIEW_REQUIRED']).optional(),
}).strict();

export type EncounterDefinition = z.infer<typeof EncounterSchema>;
