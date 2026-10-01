import { migrateSaveData, SaveMigrationError, type SaveGame, type SaveMigration } from '../domain/save/index';
import { SaveGameV1Schema } from '../schemas/save';

export class SaveValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SaveValidationError';
  }
}

/** Raw stored value -> migrated + validated SaveGame. Throws typed errors; never silently repairs. */
export function decodeSave(raw: unknown, migrations?: readonly SaveMigration[]): SaveGame {
  const migrated = migrateSaveData(raw, migrations);
  const parsed = SaveGameV1Schema.safeParse(migrated);
  if (!parsed.success) {
    throw new SaveValidationError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  return parsed.data as SaveGame;
}

/** Validate before writing so corrupt state is never persisted. Returns a JSON-safe deep copy. */
export function encodeSave(save: SaveGame): SaveGame {
  const parsed = SaveGameV1Schema.safeParse(save);
  if (!parsed.success) throw new SaveValidationError(parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '));
  return JSON.parse(JSON.stringify(parsed.data)) as SaveGame;
}

export { SaveMigrationError };
