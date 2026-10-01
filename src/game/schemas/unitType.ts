import { z } from 'zod';
import { LocalizationKeySchema, UnitTypeCodeSchema, UnitTypeIdSchema } from './ids';

export const UnitTypeSchema = z.object({
  id: UnitTypeIdSchema,
  code: UnitTypeCodeSchema,
  nameKey: LocalizationKeySchema,
  descriptionKey: LocalizationKeySchema,
  /** Unit code this unit deals advantaged damage to. Must match the domain triangle. */
  advantageOver: UnitTypeCodeSchema,
}).strict();

export type UnitTypeDefinition = z.infer<typeof UnitTypeSchema>;
