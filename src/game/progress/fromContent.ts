import { maxTroopsAt } from '../battle/fromContent';
import { learnedTacticsAtLevel } from '../progression/leveling';
import type { ContentRegistry } from '../content/registry';
import type { ProgressContext } from '../domain/progress/index';

/** Adapter: content registry -> pure progression context. */
export function buildProgressContext(registry: ContentRegistry): ProgressContext {
  return {
    quests: registry.quests,
    events: [...registry.events.values()].sort((a, b) => a.id.localeCompare(b.id)),
    initialOwner: (id) => registry.locations.get(id)?.initialOwner ?? 'NEUTRAL',
    maxTroops: (id, level) => maxTroopsAt(registry, id, level),
    newGeneralProgress: (id, level) => {
      const g = registry.generals.get(id);
      if (!g) throw new Error(`unknown general ${id}`);
      return { level, xp: 0, currentTroops: maxTroopsAt(registry, id, level), learnedTacticIds: learnedTacticsAtLevel(registry, id, level), equipment: {} };
    },
  };
}
