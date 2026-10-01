import Dexie, { type Table } from 'dexie';
import type { SaveGame } from '../domain/save/index';
import type { SaveRepository, SaveSummary } from './repository';
import { decodeSave, encodeSave } from './saveCodec';

interface SaveRow {
  slotId: string;
  saveVersion: number;
  updatedAt: string;
  /** Stored as a plain object; decoded through migration + schema on every load. */
  data: unknown;
}

export const SAVE_DB_NAME = 'three-kingdoms-web';

class SaveDatabase extends Dexie {
  saves!: Table<SaveRow, string>;

  constructor(name: string, options?: ConstructorParameters<typeof Dexie>[1]) {
    super(name, options);
    // Dexie schema v1. Bump with an explicit .upgrade() — never destructively.
    this.version(1).stores({ saves: 'slotId, updatedAt' });
  }
}

/** IndexedDB adapter (ADR-003). */
export class DexieSaveRepository implements SaveRepository {
  private readonly db: SaveDatabase;

  constructor(name: string = SAVE_DB_NAME, options?: ConstructorParameters<typeof Dexie>[1]) {
    this.db = new SaveDatabase(name, options);
  }

  async load(slotId: string): Promise<SaveGame | null> {
    const row = await this.db.saves.get(slotId);
    return row ? decodeSave(row.data) : null;
  }

  async save(save: SaveGame): Promise<void> {
    const data = encodeSave(save);
    await this.db.saves.put({ slotId: data.slotId, saveVersion: data.saveVersion, updatedAt: data.updatedAt, data });
  }

  async list(): Promise<SaveSummary[]> {
    const rows = await this.db.saves.orderBy('updatedAt').reverse().toArray();
    return rows.map(({ slotId, saveVersion, updatedAt }) => ({ slotId, saveVersion, updatedAt }));
  }

  async remove(slotId: string): Promise<void> {
    await this.db.saves.delete(slotId);
  }

  /** Test/maintenance hook for writing raw legacy rows. */
  async putRaw(slotId: string, data: unknown): Promise<void> {
    await this.db.saves.put({ slotId, saveVersion: -1, updatedAt: '', data });
  }

  close(): void {
    this.db.close();
  }
}
