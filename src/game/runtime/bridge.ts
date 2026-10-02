/**
 * Typed React <-> Phaser bridge. No React or Phaser import: both sides talk
 * through these events, so either side can be replaced or tested in isolation.
 */
import type { BattleEvent, Side, UnitType } from '../domain/battle/types';

export type SceneKey = 'Boot' | 'Preload' | 'World' | 'Battle';
export type AggroState = 'GUARD' | 'PATROL' | 'CHASE' | 'RETURN' | 'ENGAGED';

/** Runtime (Phaser) -> UI (React). */
export interface RuntimeEvents {
  'scene-ready': { scene: SceneKey };
  'player-moved': { x: number; y: number; moving: boolean };
  'aggro-changed': { enemyId: string; state: AggroState };
  'field-hotspot-changed': { hotspotId: string | null; destinationLocationId: string | null };
  encounter: { encounterId: string; enemyId: string };
  'battle-playback-done': { turn: number };
  'runtime-error': { message: string };
}

export interface BattleUnitView {
  id: string;
  side: Side;
  slot: number;
  /** Short display label (procedural token text). */
  label: string;
  troops: number;
  maxTroops: number;
  unitType: UnitType;
}

/** UI (React) -> Runtime (Phaser). */
export interface UiCommands {
  'set-paused': { paused: boolean };
  'move-direction': { dx: number; dy: number } | null;
  'resume-world': { defeatedEnemyId: string | null };
  'sync-world': { defeatedEncounterIds: readonly string[] };
  'set-field-location': {
    locationId: string;
    discoveredLocationIds: readonly string[];
    defeatedEncounterIds: readonly string[];
    availableDestinationIds: readonly string[];
  };
  'start-battle-view': { battleId: string; units: readonly BattleUnitView[] };
  'play-battle-events': { turn: number; events: readonly BattleEvent[]; speed: 1 | 2 | 3 };
  'end-battle-view': Record<string, never>;
}

type Handler<T> = (payload: T) => void;

class TypedEmitter<Events extends object> {
  private readonly handlers = new Map<keyof Events, Set<Handler<never>>>();

  on<K extends keyof Events>(event: K, handler: Handler<Events[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) this.handlers.set(event, (set = new Set()));
    set.add(handler as Handler<never>);
    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(event: K, handler: Handler<Events[K]>): void {
    this.handlers.get(event)?.delete(handler as Handler<never>);
  }

  emit<K extends keyof Events>(event: K, payload: Events[K]): void {
    for (const handler of [...(this.handlers.get(event) ?? [])]) (handler as Handler<Events[K]>)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }

  listenerCount(): number {
    let n = 0;
    for (const set of this.handlers.values()) n += set.size;
    return n;
  }
}

export class GameBridge {
  /** Phaser emits, React listens. */
  readonly runtime = new TypedEmitter<RuntimeEvents>();
  /** React emits, Phaser listens. */
  readonly ui = new TypedEmitter<UiCommands>();

  dispose(): void {
    this.runtime.clear();
    this.ui.clear();
  }
}
