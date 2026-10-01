/**
 * SaveGame v1 — persistent player progress only (docs/specs/GAME_DATA_SCHEMA.md §Save).
 * Static content (base stats, max troops, tactic definitions) is NEVER copied here;
 * it is re-derived from content by id + level on load.
 */
export const CURRENT_SAVE_VERSION = 1 as const;

export type FlagValue = boolean | number | string;
export type QuestStatus = 'ACTIVE' | 'COMPLETED' | 'FAILED';
export type Faction = 'PLAYER' | 'YELLOW_TURBAN' | 'HAN' | 'NEUTRAL';

export interface GeneralProgress {
  level: number;
  xp: number;
  /** Current troops; max troops are derived from content + level. */
  currentTroops: number;
  learnedTacticIds: string[];
  equipment: { weapon?: string; armor?: string; accessory?: string };
}

export interface PartyState {
  /** Up to 5 active generals, index = formation slot. */
  activeGeneralIds: string[];
  reserveGeneralIds: string[];
  formationId: string | null;
}

export interface WorldCheckpoint {
  regionId: string;
  locationId: string | null;
  position: { x: number; y: number };
  /** Safe-point id used for recovery (e.g. last entered location). */
  checkpointId: string;
}

export interface QuestProgress {
  status: QuestStatus;
  stepIndex: number;
}

/** Minimal dynamic battle snapshot; combatant stats are rebuilt from content on restore. */
export interface BattleCheckpoint {
  encounterId: string;
  boundary: 'BATTLE_START' | 'TURN_END';
  turn: number;
  rngState: number;
  tp: { PLAYER: number; ENEMY: number };
  formationIds: { PLAYER: string | null; ENEMY: string | null };
  combatants: Array<{
    id: string;
    side: 'PLAYER' | 'ENEMY';
    slot: number;
    troops: number;
    statuses: Array<{ code: 'CONFUSED' | 'INSPIRED' | 'TAUNTING'; remainingTurns: number }>;
  }>;
}

export interface SaveGameV1 {
  saveVersion: 1;
  contentVersion: string;
  slotId: string;
  /** ISO timestamps supplied by the caller; domain never reads the clock. */
  createdAt: string;
  updatedAt: string;
  playTimeSeconds: number;
  gold: number;
  party: PartyState;
  generals: Record<string, GeneralProgress>;
  inventory: Record<string, number>;
  world: WorldCheckpoint;
  locationOwnership: Record<string, Faction>;
  discoveredLocationIds: string[];
  defeatedEncounterIds: string[];
  quests: Record<string, QuestProgress>;
  flags: Record<string, FlagValue>;
  /** One-shot story events already fired. */
  completedEventIds: string[];
  unlockedFormationIds: string[];
  unlockedRegionIds: string[];
  battleCheckpoint: BattleCheckpoint | null;
}

export type SaveGame = SaveGameV1;
