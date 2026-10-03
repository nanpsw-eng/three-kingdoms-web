import type { FlagValue, Faction, GeneralProgress } from '../save/types.js';

/** Structural mirrors of the content Condition/Effect/Trigger schemas (domain stays schema-free). */
export type ProgressCondition =
  | { type: 'FLAG_EQUALS'; flag: string; value: FlagValue }
  | { type: 'ENCOUNTER_DEFEATED'; encounterId: string }
  | { type: 'HAS_GENERAL'; generalId: string }
  | { type: 'QUEST_AT_STEP'; questId: string; stepIndex: number }
  | { type: 'LOCATION_OWNED'; locationId: string };

export type ProgressEffect =
  | { type: 'SET_FLAG'; flag: string; value: FlagValue }
  | { type: 'RECRUIT_GENERAL'; generalId: string; level: number; toReserveIfFull: boolean }
  | { type: 'SET_LOCATION_OWNER'; locationId: string; owner: Faction }
  | { type: 'DISCOVER_LOCATION'; locationId: string }
  | { type: 'UNLOCK_REGION'; regionId: string }
  | { type: 'UNLOCK_FORMATION'; formationId: string }
  | { type: 'GIVE_GOLD'; amount: number }
  | { type: 'START_QUEST'; questId: string }
  | { type: 'REST_PARTY' };

export type ProgressTrigger =
  | { type: 'GAME_START' }
  | { type: 'ENTER_LOCATION'; locationId: string }
  | { type: 'ENCOUNTER_VICTORY'; encounterId: string }
  | { type: 'TALK_NPC'; npcId: string }
  | { type: 'SEARCH_LOCATION'; locationId: string };

export interface QuestSpec {
  id: string;
  steps: ReadonlyArray<{ completeWhen: ProgressCondition }>;
  onComplete: readonly ProgressEffect[];
}

export interface EventSpec {
  id: string;
  trigger: ProgressTrigger;
  conditions: readonly ProgressCondition[];
  effects: readonly ProgressEffect[];
  once: boolean;
}

/** Content-derived lookups the engine needs; supplied by the adapter layer. */
export interface ProgressContext {
  quests: ReadonlyMap<string, QuestSpec>;
  /** Events in deterministic (id) order. */
  events: readonly EventSpec[];
  initialOwner(locationId: string): Faction;
  newGeneralProgress(generalId: string, level: number): GeneralProgress;
  maxTroops(generalId: string, level: number): number;
}

export interface ProgressLogEntry {
  kind: 'EVENT_FIRED' | 'QUEST_STARTED' | 'QUEST_STEP' | 'QUEST_COMPLETED' | 'RECRUITED' | 'OWNER_CHANGED' | 'REGION_UNLOCKED' | 'FORMATION_UNLOCKED';
  id: string;
}
