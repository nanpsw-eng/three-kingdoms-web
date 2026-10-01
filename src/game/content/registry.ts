import type { z } from 'zod';
import {
  EncounterSchema,
  FormationSchema,
  GeneralSchema,
  LocaleTableSchema,
  TacticSchema,
  TraitSchema,
  UnitTypeSchema,
  type EncounterDefinition,
  type FormationDefinition,
  type GeneralDefinition,
  type LocaleTable,
  type TacticDefinition,
  type TraitDefinition,
  type UnitTypeDefinition,
} from '../schemas';

/**
 * Raw content as loaded from JSON files, grouped by collection directory.
 * Each file may hold a single record or an array of records.
 * Pure: no fs / Vite / React / Phaser dependency, so it runs in tests, scripts and the app.
 */
export interface RawContentFile {
  /** Repository-relative path, used for error messages only. */
  path: string;
  data: unknown;
}

export type ContentIssueCode = 'SCHEMA' | 'DUPLICATE_ID' | 'BROKEN_REFERENCE' | 'MISSING_LOCALIZATION' | 'INVARIANT' | 'UNKNOWN_COLLECTION';

export interface ContentIssue {
  code: ContentIssueCode;
  path: string;
  message: string;
}

export interface ContentRegistry {
  generals: ReadonlyMap<string, GeneralDefinition>;
  traits: ReadonlyMap<string, TraitDefinition>;
  tactics: ReadonlyMap<string, TacticDefinition>;
  formations: ReadonlyMap<string, FormationDefinition>;
  unitTypes: ReadonlyMap<string, UnitTypeDefinition>;
  encounters: ReadonlyMap<string, EncounterDefinition>;
  locales: Readonly<Record<string, LocaleTable>>;
}

export type ContentValidationResult =
  | { ok: true; registry: ContentRegistry; issues: [] }
  | { ok: false; registry: ContentRegistry; issues: ContentIssue[] };

/** Directory name under src/content → collection key. */
export const COLLECTION_DIRS = {
  generals: 'generals',
  traits: 'traits',
  tactics: 'tactics',
  formations: 'formations',
  'unit-types': 'unitTypes',
  encounters: 'encounters',
  locales: 'locales',
} as const;

type RecordCollection = Exclude<keyof ContentRegistry, 'locales'>;

const RECORD_SCHEMAS: { [K in RecordCollection]: z.ZodType<ContentRegistry[K] extends ReadonlyMap<string, infer V> ? V : never> } = {
  generals: GeneralSchema,
  traits: TraitSchema,
  tactics: TacticSchema,
  formations: FormationSchema,
  unitTypes: UnitTypeSchema,
  encounters: EncounterSchema,
};

export function collectionOf(path: string): string | null {
  const match = /(?:^|\/)content\/([^/]+)\//.exec(path.replace(/\\/g, '/'));
  return match?.[1] ?? null;
}

function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}

/** Collect every `*Key` string property (localization references) from a record. */
function localizationKeysOf(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const v of value) localizationKeysOf(v, out);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k.endsWith('Key') && typeof v === 'string') out.push(v);
      else localizationKeysOf(v, out);
    }
  }
  return out;
}

export function validateContent(files: readonly RawContentFile[]): ContentValidationResult {
  const issues: ContentIssue[] = [];
  const maps = {
    generals: new Map<string, GeneralDefinition>(),
    traits: new Map<string, TraitDefinition>(),
    tactics: new Map<string, TacticDefinition>(),
    formations: new Map<string, FormationDefinition>(),
    unitTypes: new Map<string, UnitTypeDefinition>(),
    encounters: new Map<string, EncounterDefinition>(),
  };
  const recordPaths = new Map<string, string>();
  const locales: Record<string, LocaleTable> = {};
  const allIds = new Map<string, string>();

  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const dir = collectionOf(file.path);
    const collection = dir ? (COLLECTION_DIRS as Record<string, string>)[dir] : undefined;
    if (!collection) {
      issues.push({ code: 'UNKNOWN_COLLECTION', path: file.path, message: `unknown content collection "${dir ?? '?'}"` });
      continue;
    }

    if (collection === 'locales') {
      const locale = file.path.replace(/\\/g, '/').split('/').pop()!.replace(/\.json$/, '');
      const parsed = LocaleTableSchema.safeParse(file.data);
      if (!parsed.success) {
        issues.push({ code: 'SCHEMA', path: file.path, message: formatZodError(parsed.error) });
        continue;
      }
      locales[locale] = { ...(locales[locale] ?? {}), ...parsed.data };
      continue;
    }

    const key = collection as RecordCollection;
    const schema = RECORD_SCHEMAS[key];
    const records = Array.isArray(file.data) ? file.data : [file.data];
    records.forEach((raw, index) => {
      const at = Array.isArray(file.data) ? `${file.path}[${index}]` : file.path;
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        issues.push({ code: 'SCHEMA', path: at, message: formatZodError(parsed.error) });
        return;
      }
      const record = parsed.data as { id: string };
      const previous = allIds.get(record.id);
      if (previous) {
        issues.push({ code: 'DUPLICATE_ID', path: at, message: `duplicate id ${record.id} (first defined in ${previous})` });
        return;
      }
      allIds.set(record.id, at);
      recordPaths.set(record.id, at);
      (maps[key] as Map<string, unknown>).set(record.id, record);
    });
  }

  const registry: ContentRegistry = { ...maps, locales };
  issues.push(...validateReferences(registry, recordPaths));

  return issues.length === 0 ? { ok: true, registry, issues: [] } : { ok: false, registry, issues };
}

function validateReferences(registry: ContentRegistry, paths: ReadonlyMap<string, string>): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const ref = (fromId: string, field: string, target: string, exists: boolean) => {
    if (!exists) issues.push({ code: 'BROKEN_REFERENCE', path: paths.get(fromId) ?? fromId, message: `${fromId}.${field} -> ${target} not found` });
  };

  const unitCodes = new Set([...registry.unitTypes.values()].map((u) => u.code));
  for (const general of registry.generals.values()) {
    for (const id of general.traitIds) ref(general.id, 'traitIds', id, registry.traits.has(id));
    for (const id of general.initialTacticIds) ref(general.id, 'initialTacticIds', id, registry.tactics.has(id));
    ref(general.id, 'unitType', general.unitType, unitCodes.has(general.unitType));
  }

  for (const enc of registry.encounters.values()) {
    const slots = new Set<number>();
    const combatIds = new Set<string>();
    for (const e of enc.enemies) {
      ref(enc.id, 'enemies.generalId', e.generalId, registry.generals.has(e.generalId));
      const cid = e.combatId ?? e.generalId;
      if (slots.has(e.slot)) issues.push({ code: 'INVARIANT', path: paths.get(enc.id) ?? enc.id, message: `${enc.id}: duplicate enemy slot ${e.slot}` });
      if (combatIds.has(cid)) issues.push({ code: 'INVARIANT', path: paths.get(enc.id) ?? enc.id, message: `${enc.id}: duplicate combat id ${cid} (set combatId)` });
      slots.add(e.slot);
      combatIds.add(cid);
    }
    if (enc.enemyFormationId) ref(enc.id, 'enemyFormationId', enc.enemyFormationId, registry.formations.has(enc.enemyFormationId));
  }

  const seenCodes = new Map<string, string>();
  for (const unit of registry.unitTypes.values()) {
    const prior = seenCodes.get(unit.code);
    if (prior) issues.push({ code: 'DUPLICATE_ID', path: paths.get(unit.id) ?? unit.id, message: `unit code ${unit.code} also used by ${prior}` });
    seenCodes.set(unit.code, unit.id);
    ref(unit.id, 'advantageOver', unit.advantageOver, unitCodes.has(unit.advantageOver));
  }

  // Every referenced localization key must exist in the default locale.
  const ko = registry.locales.ko;
  if (!ko) {
    issues.push({ code: 'MISSING_LOCALIZATION', path: 'src/content/locales/ko.json', message: 'default locale "ko" not found' });
  } else {
    const collections: ReadonlyMap<string, unknown>[] = [registry.generals, registry.traits, registry.tactics, registry.formations, registry.unitTypes, registry.encounters];
    for (const map of collections) {
      for (const [id, record] of map) {
        for (const key of localizationKeysOf(record)) {
          if (!(key in ko)) issues.push({ code: 'MISSING_LOCALIZATION', path: paths.get(id) ?? id, message: `${id}: ko missing "${key}"` });
        }
      }
    }
  }

  return issues;
}

export function formatIssues(issues: readonly ContentIssue[]): string {
  return issues.map((i) => `[${i.code}] ${i.path}: ${i.message}`).join('\n');
}
