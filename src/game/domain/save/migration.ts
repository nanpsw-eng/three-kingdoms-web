import { CURRENT_SAVE_VERSION } from './types.js';

/** One explicit, testable step from `from` to `from + 1`. Must be pure. */
export interface SaveMigration {
  from: number;
  to: number;
  migrate(raw: Record<string, unknown>): Record<string, unknown>;
}

export class SaveMigrationError extends Error {
  constructor(
    readonly code: 'NOT_AN_OBJECT' | 'MISSING_VERSION' | 'NEWER_THAN_SUPPORTED' | 'NO_MIGRATION_PATH',
    message: string,
  ) {
    super(message);
    this.name = 'SaveMigrationError';
  }
}

/** v1 is the first version: no migrations yet. Append steps here; never edit shipped ones. */
export const SAVE_MIGRATIONS: readonly SaveMigration[] = [];

/**
 * Bring a raw stored save up to `target` by chaining migrations.
 * Returns an unvalidated object; callers validate the result against the schema.
 */
export function migrateSaveData(
  raw: unknown,
  migrations: readonly SaveMigration[] = SAVE_MIGRATIONS,
  target: number = CURRENT_SAVE_VERSION,
): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new SaveMigrationError('NOT_AN_OBJECT', 'save data is not an object');
  let data = { ...(raw as Record<string, unknown>) };
  const stored = data.saveVersion;
  if (typeof stored !== 'number' || !Number.isInteger(stored)) throw new SaveMigrationError('MISSING_VERSION', 'save has no integer saveVersion');
  let version: number = stored;
  if (version > target) throw new SaveMigrationError('NEWER_THAN_SUPPORTED', `save version ${version} is newer than supported ${target}`);
  while (version < target) {
    const step = migrations.find((m) => m.from === version);
    if (!step || step.to !== version + 1) throw new SaveMigrationError('NO_MIGRATION_PATH', `no migration from save version ${version}`);
    data = { ...step.migrate(data), saveVersion: step.to };
    version = step.to;
  }
  return data;
}
