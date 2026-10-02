import { z } from 'zod';
import { GeneralIdSchema, LocalizationKeySchema, TacticIdSchema, TraitIdSchema, UnitTypeCodeSchema } from './ids';

export const CoreStatsSchema = z.object({
  strength: z.number().int().min(1).max(100),
  intelligence: z.number().int().min(1).max(100),
  command: z.number().int().min(1).max(100),
  speed: z.number().int().min(1).max(100),
});

const StatBonusSchema = z.object({
  strength: z.number().int().min(0).max(5).optional(),
  intelligence: z.number().int().min(0).max(5).optional(),
  command: z.number().int().min(0).max(5).optional(),
  speed: z.number().int().min(0).max(5).optional(),
}).strict();

export const LevelMilestoneSchema = z.object({
  level: z.number().int().min(2).max(30),
  statBonuses: StatBonusSchema.default({}),
  tacticIds: z.array(TacticIdSchema).default([]),
}).strict();

export const GeneralSchema = z.object({
  id: GeneralIdSchema,
  nameKey: LocalizationKeySchema,
  courtesyNameKey: LocalizationKeySchema.optional(),
  role: z.enum(['BALANCED', 'SUPPORT', 'PHYSICAL', 'COMMANDER', 'HEAVY_PHYSICAL', 'TACTIC']),
  baseStats: CoreStatsSchema,
  troopGrowth: z.object({
    baseTroop: z.number().int().positive(),
    perLevel: z.number().int().nonnegative(),
    category: z.enum(['HIGH', 'NORMAL', 'LOW']),
  }),
  /** References a UnitType record by its `code`. */
  unitType: UnitTypeCodeSchema,
  weaponAptitudes: z.record(z.string(), z.enum(['S', 'A', 'B', 'C'])),
  traitIds: z.array(TraitIdSchema),
  initialTacticIds: z.array(TacticIdSchema),
  /** Sparse, identity-preserving level rewards. Stats remain derived from content + level. */
  levelMilestones: z.array(LevelMilestoneSchema).default([]),
  tags: z.array(z.string()).default([]),
  /** Content review state; see docs/specs/VERTICAL_SLICE.md caution on historical claims. */
  contentStatus: z.enum(['APPROVED', 'PROVISIONAL_CONTENT_REVIEW_REQUIRED']).optional(),
}).strict().superRefine((general, ctx) => {
  const levels = new Set<number>();
  for (const milestone of general.levelMilestones) {
    if (levels.has(milestone.level)) {
      ctx.addIssue({ code: 'custom', path: ['levelMilestones'], message: `duplicate level milestone ${milestone.level}` });
    }
    levels.add(milestone.level);
  }
});

export type GeneralDefinition = z.infer<typeof GeneralSchema>;
