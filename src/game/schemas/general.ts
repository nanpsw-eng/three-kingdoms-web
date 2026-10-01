import { z } from 'zod';

export const GeneralIdSchema = z.string().regex(/^GEN_[A-Z0-9_]+$/);
export const TraitIdSchema = z.string().regex(/^TRT_[A-Z0-9_]+$/);
export const TacticIdSchema = z.string().regex(/^TAC_[A-Z0-9_]+$/);

export const CoreStatsSchema = z.object({
  strength: z.number().int().min(1).max(100),
  intelligence: z.number().int().min(1).max(100),
  command: z.number().int().min(1).max(100),
  speed: z.number().int().min(1).max(100),
});

export const GeneralSchema = z.object({
  id: GeneralIdSchema,
  nameKey: z.string().min(1),
  courtesyNameKey: z.string().min(1).optional(),
  role: z.enum(['BALANCED', 'SUPPORT', 'PHYSICAL', 'COMMANDER', 'HEAVY_PHYSICAL', 'TACTIC']),
  baseStats: CoreStatsSchema,
  troopGrowth: z.object({
    baseTroop: z.number().int().positive(),
    perLevel: z.number().int().nonnegative(),
    category: z.enum(['HIGH', 'NORMAL', 'LOW']),
  }),
  unitType: z.enum(['SPEAR', 'CAVALRY', 'ARCHER']),
  weaponAptitudes: z.record(z.string(), z.enum(['S', 'A', 'B', 'C'])),
  traitIds: z.array(TraitIdSchema),
  initialTacticIds: z.array(TacticIdSchema),
  tags: z.array(z.string()).default([]),
});

export type GeneralDefinition = z.infer<typeof GeneralSchema>;
