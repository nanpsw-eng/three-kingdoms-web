import type { z } from 'zod';
import {
  EncounterSchema,
  FlagSchema,
  FormationSchema,
  GameEventSchema,
  GeneralSchema,
  LocaleTableSchema,
  LocationSchema,
  NpcSchema,
  QuestSchema,
  RegionSchema,
  TacticSchema,
  TraitSchema,
  UnitTypeSchema,
  type Condition,
  type Effect,
  type EncounterDefinition,
  type FlagDefinition,
  type FormationDefinition,
  type GameEventDefinition,
  type GeneralDefinition,
  type LocaleTable,
  type LocationDefinition,
  type NpcDefinition,
  type QuestDefinition,
  type RegionDefinition,
  type TacticDefinition,
  type TraitDefinition,
  type Trigger,
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
  regions: ReadonlyMap<string, RegionDefinition>;
  locations: ReadonlyMap<string, LocationDefinition>;
  npcs: ReadonlyMap<string, NpcDefinition>;
  flags: ReadonlyMap<string, FlagDefinition>;
  quests: ReadonlyMap<string, QuestDefinition>;
  events: ReadonlyMap<string, GameEventDefinition>;
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
  regions: 'regions',
  locations: 'locations',
  npcs: 'npcs',
  flags: 'flags',
  quests: 'quests',
  events: 'events',
  locales: 'locales',
} as const;

type RecordCollection = Exclude<keyof ContentRegistry, 'locales'>;
type RecordOf<K extends RecordCollection> = ContentRegistry[K] extends ReadonlyMap<string, infer V> ? V : never;

const RECORD_SCHEMAS: { [K in RecordCollection]: z.ZodType<RecordOf<K>> } = {
  generals: GeneralSchema,
  traits: TraitSchema,
  tactics: TacticSchema,
  formations: FormationSchema,
  unitTypes: UnitTypeSchema,
  encounters: EncounterSchema,
  regions: RegionSchema,
  locations: LocationSchema,
  npcs: NpcSchema,
  flags: FlagSchema,
  quests: QuestSchema,
  events: GameEventSchema,
};

const RECORD_COLLECTIONS = Object.keys(RECORD_SCHEMAS) as RecordCollection[];

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

export function emptyRegistry(): ContentRegistry {
  return Object.fromEntries([...RECORD_COLLECTIONS.map((k) => [k, new Map()]), ['locales', {}]]) as unknown as ContentRegistry;
}

export function validateContent(files: readonly RawContentFile[]): ContentValidationResult {
  const issues: ContentIssue[] = [];
  const maps = Object.fromEntries(RECORD_COLLECTIONS.map((k) => [k, new Map<string, unknown>()])) as Record<RecordCollection, Map<string, unknown>>;
  const recordPaths = new Map<string, string>();
  const locales: Record<string, LocaleTable> = {};

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
      for (const key of Object.keys(parsed.data)) {
        if (locales[locale] && key in locales[locale]!) issues.push({ code: 'DUPLICATE_ID', path: file.path, message: `duplicate localization key ${key}` });
      }
      locales[locale] = { ...(locales[locale] ?? {}), ...parsed.data };
      continue;
    }

    const key = collection as RecordCollection;
    const schema = RECORD_SCHEMAS[key] as z.ZodType<{ id: string }>;
    const records = Array.isArray(file.data) ? file.data : [file.data];
    records.forEach((raw, index) => {
      const at = Array.isArray(file.data) ? `${file.path}[${index}]` : file.path;
      const parsed = schema.safeParse(raw);
      if (!parsed.success) {
        issues.push({ code: 'SCHEMA', path: at, message: formatZodError(parsed.error) });
        return;
      }
      const record = parsed.data;
      const previous = recordPaths.get(record.id);
      if (previous) {
        issues.push({ code: 'DUPLICATE_ID', path: at, message: `duplicate id ${record.id} (first defined in ${previous})` });
        return;
      }
      recordPaths.set(record.id, at);
      maps[key].set(record.id, record);
    });
  }

  const registry = { ...maps, locales } as unknown as ContentRegistry;
  issues.push(...validateReferences(registry, recordPaths));

  return issues.length === 0 ? { ok: true, registry, issues: [] } : { ok: false, registry, issues };
}

function validateReferences(registry: ContentRegistry, paths: ReadonlyMap<string, string>): ContentIssue[] {
  const issues: ContentIssue[] = [];
  const at = (id: string) => paths.get(id) ?? id;
  const ref = (fromId: string, field: string, target: string, exists: boolean) => {
    if (!exists) issues.push({ code: 'BROKEN_REFERENCE', path: at(fromId), message: `${fromId}.${field} -> ${target} not found` });
  };
  const invariant = (fromId: string, message: string) => issues.push({ code: 'INVARIANT', path: at(fromId), message: `${fromId}: ${message}` });

  const unitCodes = new Set([...registry.unitTypes.values()].map((u) => u.code));
  for (const general of registry.generals.values()) {
    for (const id of general.traitIds) ref(general.id, 'traitIds', id, registry.traits.has(id));
    for (const id of general.initialTacticIds) ref(general.id, 'initialTacticIds', id, registry.tactics.has(id));
    ref(general.id, 'unitType', general.unitType, unitCodes.has(general.unitType));
  }

  const seenCodes = new Map<string, string>();
  for (const unit of registry.unitTypes.values()) {
    const prior = seenCodes.get(unit.code);
    if (prior) issues.push({ code: 'DUPLICATE_ID', path: at(unit.id), message: `unit code ${unit.code} also used by ${prior}` });
    seenCodes.set(unit.code, unit.id);
    ref(unit.id, 'advantageOver', unit.advantageOver, unitCodes.has(unit.advantageOver));
  }

  for (const enc of registry.encounters.values()) {
    const slots = new Set<number>();
    const combatIds = new Set<string>();
    for (const e of enc.enemies) {
      ref(enc.id, 'enemies.generalId', e.generalId, registry.generals.has(e.generalId));
      const cid = e.combatId ?? e.generalId;
      if (slots.has(e.slot)) invariant(enc.id, `duplicate enemy slot ${e.slot}`);
      if (combatIds.has(cid)) invariant(enc.id, `duplicate combat id ${cid} (set combatId)`);
      slots.add(e.slot);
      combatIds.add(cid);
    }
    if (enc.enemyFormationId) ref(enc.id, 'enemyFormationId', enc.enemyFormationId, registry.formations.has(enc.enemyFormationId));
  }

  const flag = (fromId: string, field: string, id: string | null | undefined) => {
    if (id) ref(fromId, field, id, registry.flags.has(id));
  };

  for (const region of registry.regions.values()) flag(region.id, 'unlockFlag', region.unlockFlag);

  for (const loc of registry.locations.values()) {
    ref(loc.id, 'regionId', loc.regionId, registry.regions.has(loc.regionId));
    for (const c of loc.connections) {
      ref(loc.id, 'connections', c, registry.locations.has(c));
      const other = registry.locations.get(c);
      if (other && !other.connections.includes(loc.id)) invariant(loc.id, `connection to ${c} is not reciprocated`);
    }
    for (const e of loc.encounters) {
      ref(loc.id, 'encounters.encounterId', e.encounterId, registry.encounters.has(e.encounterId));
      flag(loc.id, 'encounters.activeUnlessFlag', e.activeUnlessFlag);
    }
  }

  for (const npc of registry.npcs.values()) ref(npc.id, 'locationId', npc.locationId, registry.locations.has(npc.locationId));

  const checkCondition = (fromId: string, c: Condition) => {
    switch (c.type) {
      case 'FLAG_EQUALS': return flag(fromId, 'condition.flag', c.flag);
      case 'ENCOUNTER_DEFEATED': return ref(fromId, 'condition.encounterId', c.encounterId, registry.encounters.has(c.encounterId));
      case 'HAS_GENERAL': return ref(fromId, 'condition.generalId', c.generalId, registry.generals.has(c.generalId));
      case 'QUEST_AT_STEP': {
        const q = registry.quests.get(c.questId);
        ref(fromId, 'condition.questId', c.questId, Boolean(q));
        if (q && c.stepIndex > q.steps.length) invariant(fromId, `quest ${c.questId} has no step ${c.stepIndex}`);
        return;
      }
      case 'LOCATION_OWNED': return ref(fromId, 'condition.locationId', c.locationId, registry.locations.has(c.locationId));
    }
  };
  const checkEffect = (fromId: string, e: Effect) => {
    switch (e.type) {
      case 'SET_FLAG': return flag(fromId, 'effect.flag', e.flag);
      case 'RECRUIT_GENERAL': return ref(fromId, 'effect.generalId', e.generalId, registry.generals.has(e.generalId));
      case 'SET_LOCATION_OWNER':
      case 'DISCOVER_LOCATION': return ref(fromId, 'effect.locationId', e.locationId, registry.locations.has(e.locationId));
      case 'UNLOCK_REGION': return ref(fromId, 'effect.regionId', e.regionId, registry.regions.has(e.regionId));
      case 'UNLOCK_FORMATION': return ref(fromId, 'effect.formationId', e.formationId, registry.formations.has(e.formationId));
      case 'START_QUEST': return ref(fromId, 'effect.questId', e.questId, registry.quests.has(e.questId));
      case 'GIVE_GOLD':
      case 'REST_PARTY': return;
    }
  };
  const checkTrigger = (fromId: string, t: Trigger) => {
    switch (t.type) {
      case 'ENTER_LOCATION': return ref(fromId, 'trigger.locationId', t.locationId, registry.locations.has(t.locationId));
      case 'ENCOUNTER_VICTORY': return ref(fromId, 'trigger.encounterId', t.encounterId, registry.encounters.has(t.encounterId));
      case 'TALK_NPC': return ref(fromId, 'trigger.npcId', t.npcId, registry.npcs.has(t.npcId));
      case 'GAME_START': return;
    }
  };

  for (const quest of registry.quests.values()) {
    for (const step of quest.steps) {
      checkCondition(quest.id, step.completeWhen);
      if (step.guideLocationId) ref(quest.id, 'steps.guideLocationId', step.guideLocationId, registry.locations.has(step.guideLocationId));
    }
    for (const e of quest.onComplete) checkEffect(quest.id, e);
  }
  for (const event of registry.events.values()) {
    checkTrigger(event.id, event.trigger);
    for (const c of event.conditions) checkCondition(event.id, c);
    for (const e of event.effects) checkEffect(event.id, e);
  }

  // Every referenced localization key must exist in the default locale.
  const ko = registry.locales.ko;
  if (!ko) {
    issues.push({ code: 'MISSING_LOCALIZATION', path: 'src/content/locales/ko.json', message: 'default locale "ko" not found' });
  } else {
    for (const key of RECORD_COLLECTIONS) {
      for (const [id, record] of registry[key]) {
        for (const lk of localizationKeysOf(record)) {
          if (!(lk in ko)) issues.push({ code: 'MISSING_LOCALIZATION', path: at(id), message: `${id}: ko missing "${lk}"` });
        }
      }
    }
  }

  return issues;
}

export function formatIssues(issues: readonly ContentIssue[]): string {
  return issues.map((i) => `[${i.code}] ${i.path}: ${i.message}`).join('\n');
}
