import { z } from 'zod';
import { LocalizationKeySchema, TacticIdSchema } from './ids';

export const TacticTargetSchema = z.enum(['SINGLE_ENEMY', 'ALL_ENEMIES', 'SINGLE_ALLY', 'ALL_ALLIES', 'SELF']);

export const StatusCodeSchema = z.enum(['CONFUSED', 'INSPIRED', 'TAUNTING']);

export const TacticEffectSchema = z.discriminatedUnion('kind', [
  /** Intelligence-scaled damage. */
  z.object({ kind: z.literal('DAMAGE'), power: z.number().positive().max(5) }).strict(),
  /** Intelligence-scaled troop recovery, capped by maxTroops. */
  z.object({ kind: z.literal('HEAL'), power: z.number().positive().max(5) }).strict(),
  /**
   * Apply a status. `baseChance` omitted = guaranteed (self/ally buffs).
   * Final chance is clamped to the central control-chance bounds.
   */
  z.object({
    kind: z.literal('STATUS'),
    status: StatusCodeSchema,
    durationTurns: z.number().int().min(1).max(5),
    baseChance: z.number().min(0).max(1).optional(),
  }).strict(),
]);

export const TacticSchema = z.object({
  id: TacticIdSchema,
  nameKey: LocalizationKeySchema,
  descriptionKey: LocalizationKeySchema,
  family: z.enum(['ATTACK', 'SUPPORT', 'HEAL', 'CONTROL', 'STRATEGY']),
  tpCost: z.number().int().min(0).max(50),
  target: TacticTargetSchema,
  effect: TacticEffectSchema,
}).strict();

export type TacticDefinition = z.infer<typeof TacticSchema>;
export type TacticEffect = z.infer<typeof TacticEffectSchema>;
