import type { SaveGame } from '../domain/save/index';
import type { SaveRepository, SaveSummary } from './repository';
import { decodeSave, encodeSave } from './saveCodec';

/** In-memory adapter for tests and non-persistent previews. Stores encoded JSON like a real backend. */
export class MemorySaveRepository implements SaveRepository {
  private readonly rows = new Map<string, string>();

  async load(slotId: string): Promise<SaveGame | null> {
    const row = this.rows.get(slotId);
    return row === undefined ? null : decodeSave(JSON.parse(row));
  }

  async save(save: SaveGame): Promise<void> {
    this.rows.set(save.slotId, JSON.stringify(encodeSave(save)));
  }

  async list(): Promise<SaveSummary[]> {
    return [...this.rows.values()].map((r) => JSON.parse(r) as SaveGame).map(({ slotId, saveVersion, updatedAt }) => ({ slotId, saveVersion, updatedAt })).sort((a, b) => a.slotId.localeCompare(b.slotId));
  }

  async remove(slotId: string): Promise<void> {
    this.rows.delete(slotId);
  }

  /** Test hook: write an arbitrary raw row (e.g. legacy or corrupt data). */
  putRaw(slotId: string, raw: unknown): void {
    this.rows.set(slotId, JSON.stringify(raw));
  }
}
