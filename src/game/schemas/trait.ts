import { z } from 'zod';
import { LocalizationKeySchema, TraitIdSchema } from './ids';

/** Generic condition evaluated against the trait owner at the moment of use. */
export const TraitConditionSchema = z.object({
  selfTroopRatioAtLeast: z.number().min(0).max(1).optional(),
  selfTroopRatioBelow: z.number().min(0).max(1).optional(),
}).strict();

const multiplier = z.number().min(0.5).max(2);

/**
 * Trait effects are generic data, not general-specific engine checks
 * (docs/specs/CHARACTER.md). The battle core interprets each `type`.
 */
export const TraitEffectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('PHYSICAL_DAMAGE_MULTIPLIER'), value: multiplier, condition: TraitConditionSchema.optional() }).strict(),
  z.object({ type: z.literal('TACTIC_DAMAGE_MULTIPLIER'), value: multiplier, condition: TraitConditionSchema.optional() }).strict(),
  z.object({ type: z.literal('HEAL_POWER_MULTIPLIER'), value: multiplier, condition: TraitConditionSchema.optional() }).strict(),
  z.object({ type: z.literal('DAMAGE_TAKEN_MULTIPLIER'), value: multiplier, condition: TraitConditionSchema.optional() }).strict(),
  z.object({ type: z.literal('CONTROL_SUCCESS_BONUS'), value: z.number().min(0).max(0.5) }).strict(),
]);

export const TraitSchema = z.object({
  id: TraitIdSchema,
  nameKey: LocalizationKeySchema,
  descriptionKey: LocalizationKeySchema,
  effects: z.array(TraitEffectSchema).min(1),
}).strict();

export type TraitEffect = z.infer<typeof TraitEffectSchema>;
export type TraitDefinition = z.infer<typeof TraitSchema>;
