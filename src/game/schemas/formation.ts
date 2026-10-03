import { z } from 'zod';
import { FormationIdSchema, LocalizationKeySchema } from './ids';

const ratio = z.number().min(0.5).max(1.5);

export const ModifierSetSchema = z.object({
  physicalAttack: ratio.default(1),
  physicalDefense: ratio.default(1),
  tacticPower: ratio.default(1),
  speed: ratio.default(1),
}).strict();

export const FormationSchema = z.object({
  id: FormationIdSchema,
  nameKey: LocalizationKeySchema,
  descriptionKey: LocalizationKeySchema,
  /** Applied to every party member. */
  party: ModifierSetSchema,
  /** Exactly five slot modifiers, slot 0 = front/lead. Multiplied with `party`. */
  slots: z.array(ModifierSetSchema).length(5),
}).strict();

export type ModifierSet = z.infer<typeof ModifierSetSchema>;
export type FormationDefinition = z.infer<typeof FormationSchema>;
