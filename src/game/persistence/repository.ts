import type { SaveGame } from '../domain/save/index';

export interface SaveSummary {
  slotId: string;
  saveVersion: number;
  updatedAt: string;
}

/**
 * Persistence port. Game/UI code depends on this interface only; adapters
 * (IndexedDB/Dexie today, cloud sync later) implement it. Service-worker cache is never used for saves.
 */
export interface SaveRepository {
  load(slotId: string): Promise<SaveGame | null>;
  save(save: SaveGame): Promise<void>;
  list(): Promise<SaveSummary[]>;
  remove(slotId: string): Promise<void>;
}
