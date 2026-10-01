import { z } from 'zod';
import {
  EncounterIdSchema,
  EventIdSchema,
  FlagIdSchema,
  FormationIdSchema,
  GeneralIdSchema,
  LocalizationKeySchema,
  LocationIdSchema,
  NpcIdSchema,
  QuestIdSchema,
  RegionIdSchema,
} from './ids';
import { ContentStatusSchema, FactionSchema } from './world';

const FlagValueSchema = z.union([z.boolean(), z.number(), z.string()]);

export const ConditionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('FLAG_EQUALS'), flag: FlagIdSchema, value: FlagValueSchema }).strict(),
  z.object({ type: z.literal('ENCOUNTER_DEFEATED'), encounterId: EncounterIdSchema }).strict(),
  z.object({ type: z.literal('HAS_GENERAL'), generalId: GeneralIdSchema }).strict(),
  z.object({ type: z.literal('QUEST_AT_STEP'), questId: QuestIdSchema, stepIndex: z.number().int().min(0) }).strict(),
  z.object({ type: z.literal('LOCATION_OWNED'), locationId: LocationIdSchema }).strict(),
]);

export const EffectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('SET_FLAG'), flag: FlagIdSchema, value: FlagValueSchema }).strict(),
  z.object({ type: z.literal('RECRUIT_GENERAL'), generalId: GeneralIdSchema, level: z.number().int().min(1), toReserveIfFull: z.boolean().default(true) }).strict(),
  z.object({ type: z.literal('SET_LOCATION_OWNER'), locationId: LocationIdSchema, owner: FactionSchema }).strict(),
  z.object({ type: z.literal('DISCOVER_LOCATION'), locationId: LocationIdSchema }).strict(),
  z.object({ type: z.literal('UNLOCK_REGION'), regionId: RegionIdSchema }).strict(),
  z.object({ type: z.literal('UNLOCK_FORMATION'), formationId: FormationIdSchema }).strict(),
  z.object({ type: z.literal('GIVE_GOLD'), amount: z.number().int() }).strict(),
  z.object({ type: z.literal('START_QUEST'), questId: QuestIdSchema }).strict(),
  z.object({ type: z.literal('REST_PARTY') }).strict(),
]);

export const TriggerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('GAME_START') }).strict(),
  z.object({ type: z.literal('ENTER_LOCATION'), locationId: LocationIdSchema }).strict(),
  z.object({ type: z.literal('ENCOUNTER_VICTORY'), encounterId: EncounterIdSchema }).strict(),
  z.object({ type: z.literal('TALK_NPC'), npcId: NpcIdSchema }).strict(),
]);

export const GameEventSchema = z.object({
  id: EventIdSchema,
  trigger: TriggerSchema,
  conditions: z.array(ConditionSchema).default([]),
  effects: z.array(EffectSchema).min(1),
  /** Fire at most once per save. */
  once: z.boolean().default(true),
  contentStatus: ContentStatusSchema.optional(),
}).strict();

export const QuestSchema = z.object({
  id: QuestIdSchema,
  nameKey: LocalizationKeySchema,
  kind: z.enum(['MAIN', 'SIDE']),
  steps: z.array(z.object({
    objectiveKey: LocalizationKeySchema,
    /** Location the UI should guide toward (main-quest guidance, docs/specs/WORLD.md). */
    guideLocationId: LocationIdSchema.optional(),
    completeWhen: ConditionSchema,
  }).strict()).min(1),
  onComplete: z.array(EffectSchema).default([]),
  contentStatus: ContentStatusSchema.optional(),
}).strict();

export type Condition = z.infer<typeof ConditionSchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;
export type GameEventDefinition = z.infer<typeof GameEventSchema>;
export type QuestDefinition = z.infer<typeof QuestSchema>;
