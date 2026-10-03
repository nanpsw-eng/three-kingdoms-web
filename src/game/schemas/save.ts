import { z } from 'zod';
import type { SaveGameV1 } from '../domain/save/index';
import { EncounterIdSchema, EventIdSchema, FlagIdSchema, FormationIdSchema, GeneralIdSchema, LocationIdSchema, QuestIdSchema, RegionIdSchema, TacticIdSchema } from './ids';

const StatusSchema = z.object({ code: z.enum(['CONFUSED', 'INSPIRED', 'TAUNTING']), remainingTurns: z.number().int().min(1) }).strict();

export const BattleCheckpointSchema = z.object({
  encounterId: EncounterIdSchema,
  boundary: z.enum(['BATTLE_START', 'TURN_END']),
  turn: z.number().int().min(1),
  rngState: z.number().int().min(0).max(0xffffffff),
  tp: z.object({ PLAYER: z.number().int().min(0), ENEMY: z.number().int().min(0) }).strict(),
  formationIds: z.object({ PLAYER: FormationIdSchema.nullable(), ENEMY: FormationIdSchema.nullable() }).strict(),
  combatants: z.array(z.object({
    id: z.string().min(1),
    side: z.enum(['PLAYER', 'ENEMY']),
    slot: z.number().int().min(0).max(4),
    troops: z.number().int().min(0),
    statuses: z.array(StatusSchema),
  }).strict()).min(2).max(10),
}).strict();

export const GeneralProgressSchema = z.object({
  level: z.number().int().min(1).max(30),
  xp: z.number().int().min(0),
  currentTroops: z.number().int().min(0),
  learnedTacticIds: z.array(TacticIdSchema),
  equipment: z.object({ weapon: z.string().optional(), armor: z.string().optional(), accessory: z.string().optional() }).strict(),
}).strict();

export const SaveGameV1Schema = z.object({
  saveVersion: z.literal(1),
  contentVersion: z.string().min(1),
  slotId: z.string().regex(/^[a-z0-9_-]{1,32}$/),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  playTimeSeconds: z.number().min(0),
  gold: z.number().int().min(0),
  party: z.object({
    activeGeneralIds: z.array(GeneralIdSchema).min(1).max(5),
    reserveGeneralIds: z.array(GeneralIdSchema),
    formationId: FormationIdSchema.nullable(),
  }).strict(),
  generals: z.record(GeneralIdSchema, GeneralProgressSchema),
  inventory: z.record(z.string(), z.number().int().min(0)),
  world: z.object({
    regionId: RegionIdSchema,
    locationId: LocationIdSchema.nullable(),
    position: z.object({ x: z.number(), y: z.number() }).strict(),
    checkpointId: z.string().min(1),
  }).strict(),
  locationOwnership: z.record(LocationIdSchema, z.enum(['PLAYER', 'YELLOW_TURBAN', 'HAN', 'NEUTRAL'])),
  discoveredLocationIds: z.array(LocationIdSchema),
  defeatedEncounterIds: z.array(EncounterIdSchema),
  quests: z.record(QuestIdSchema, z.object({ status: z.enum(['ACTIVE', 'COMPLETED', 'FAILED']), stepIndex: z.number().int().min(0) }).strict()),
  flags: z.record(FlagIdSchema, z.union([z.boolean(), z.number(), z.string()])),
  completedEventIds: z.array(EventIdSchema),
  unlockedFormationIds: z.array(FormationIdSchema),
  unlockedRegionIds: z.array(RegionIdSchema),
  battleCheckpoint: BattleCheckpointSchema.nullable(),
}).strict().superRefine((save, ctx) => {
  if (save.party.formationId && !save.unlockedFormationIds.includes(save.party.formationId)) ctx.addIssue({ code: 'custom', path: ['party', 'formationId'], message: 'formation is not unlocked' });
  const party = [...save.party.activeGeneralIds, ...save.party.reserveGeneralIds];
  if (new Set(party).size !== party.length) ctx.addIssue({ code: 'custom', path: ['party'], message: 'a general appears more than once in the party' });
  for (const id of party) if (!save.generals[id]) ctx.addIssue({ code: 'custom', path: ['generals', id], message: `missing progress for party member ${id}` });
});

// Compile-time guard: schema output and domain type must stay aligned.
type Equals<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type SchemaOut = z.output<typeof SaveGameV1Schema>;
export const SAVE_SCHEMA_MATCHES_DOMAIN: Equals<keyof SchemaOut, keyof SaveGameV1> = true;
export type _AssertAssignable = SchemaOut extends SaveGameV1 ? true : never;
const _assignable: _AssertAssignable = true;
void _assignable;
