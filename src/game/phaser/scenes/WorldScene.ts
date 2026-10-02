import Phaser from 'phaser';
import {
  createWorld,
  mapSize,
  resolveEncounter,
  setMoveTarget,
  tickWorld,
  type EnemyMode,
  type Vec2,
  type WorldEvent,
  type WorldState,
} from '../../domain/world/index';
import type { GameBridge } from '../../runtime/bridge';
import { getFieldPresentation, type FieldPresentation } from '../../world/fieldPresentations';
import { PALETTE } from '../palette';

const TILE_COLORS: Record<string, number> = {
  '.': PALETTE.grass,
  ',': PALETTE.grassAlt,
  '=': PALETTE.road,
  b: PALETTE.road,
  '#': PALETTE.rock,
  T: PALETTE.tree,
  '~': PALETTE.water,
};

const TAP_SLOP = 12;
const MOVE_REPORT_MS = 250;
const DEFAULT_LOCATION = 'LOC_SOUTH_PLAIN';

interface EnemyView {
  body: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Arc;
  alert: Phaser.GameObjects.Text;
}

interface SecretView {
  marker: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
}

/**
 * Renders one location-driven field presentation at a time.
 * World rules remain in the pure domain; this scene owns only input + drawing.
 */
export class WorldScene extends Phaser.Scene {
  private world!: WorldState;
  private presentation!: FieldPresentation;
  private fieldLayer!: Phaser.GameObjects.Container;
  private player!: Phaser.GameObjects.Image;
  private marker!: Phaser.GameObjects.Image;
  private enemies = new Map<string, EnemyView>();
  private secrets = new Map<string, SecretView>();
  private discoveredLocationIds = new Set<string>();
  private defeatedEncounterIds = new Set<string>();
  private direction: Vec2 | null = null;
  private keys: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private lastReport = 0;
  private wasMoving = false;
  private unsubscribers: Array<() => void> = [];

  constructor(private readonly bridge: GameBridge) {
    super('World');
  }

  create(): void {
    const fallback = getFieldPresentation(DEFAULT_LOCATION);
    if (!fallback) throw new Error('default field presentation missing');
    this.presentation = fallback;
    this.renderPresentation(fallback);

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.world.paused) return;
      if (Phaser.Math.Distance.Between(pointer.downX, pointer.downY, pointer.upX, pointer.upY) > TAP_SLOP) return;
      const point = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
      this.apply(setMoveTarget(this.world, { x: point.x, y: point.y }));
    });
    this.keys = this.input.keyboard?.createCursorKeys() ?? null;

    this.unsubscribers.push(
      this.bridge.ui.on('move-direction', (dir) => {
        this.direction = dir ? { x: dir.dx, y: dir.dy } : null;
      }),
      this.bridge.ui.on('resume-world', ({ defeatedEnemyId }) => {
        const engaged = this.world.enemies.find((e) => e.mode === 'ENGAGED');
        if (!engaged) return;
        this.world = resolveEncounter(this.world, engaged.id, defeatedEnemyId === engaged.id ? 'DEFEATED' : 'FLED');
        this.syncEnemy(engaged.id, this.world.enemies.find((e) => e.id === engaged.id)!.mode);
      }),
      this.bridge.ui.on('sync-world', ({ defeatedEncounterIds }) => {
        this.syncMeta([...this.discoveredLocationIds], defeatedEncounterIds);
      }),
      this.bridge.ui.on('set-field-location', ({ locationId, discoveredLocationIds, defeatedEncounterIds }) => {
        const next = getFieldPresentation(locationId);
        if (!next) return;
        if (next.locationId !== this.presentation.locationId) {
          this.discoveredLocationIds = new Set(discoveredLocationIds);
          this.defeatedEncounterIds = new Set(defeatedEncounterIds);
          this.presentation = next;
          this.renderPresentation(next);
        } else {
          this.syncMeta(discoveredLocationIds, defeatedEncounterIds);
        }
      }),
      this.bridge.ui.on('set-paused', ({ paused }) => {
        this.world = { ...this.world, paused };
      }),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.cleanup());

    if (new URLSearchParams(window.location.search).has('debug')) this.installDebugHook();
    this.bridge.runtime.emit('scene-ready', { scene: 'World' });
  }

  override update(time: number, delta: number): void {
    if (!this.world || !this.player) return;
    const direction = this.direction ?? this.keyboardDirection();
    this.apply(tickWorld(this.world, { direction }, Math.min(delta, 100)));

    const p = this.world.player;
    this.player.setPosition(p.pos.x, p.pos.y);
    this.marker.setVisible(p.target !== null);
    if (p.target) this.marker.setPosition(p.target.x, p.target.y);

    for (const e of this.world.enemies) {
      const view = this.enemies.get(e.id);
      if (!view) continue;
      view.body.setPosition(e.pos.x, e.pos.y);
      view.ring.setPosition(e.home.x, e.home.y);
      view.alert.setPosition(e.pos.x, e.pos.y - 34);
    }

    const moving = p.path.length > 0 || direction !== null;
    if ((moving && time - this.lastReport > MOVE_REPORT_MS) || moving !== this.wasMoving) {
      this.lastReport = time;
      this.wasMoving = moving;
      this.bridge.runtime.emit('player-moved', { x: Math.round(p.pos.x), y: Math.round(p.pos.y), moving });
    }
  }

  private renderPresentation(presentation: FieldPresentation): void {
    this.fieldLayer?.destroy(true);
    this.enemies.clear();
    this.secrets.clear();
    this.direction = null;
    this.wasMoving = false;

    this.world = createWorld(presentation.map, presentation.enemies);
    this.world = {
      ...this.world,
      enemies: this.world.enemies.map((e) =>
        this.defeatedEncounterIds.has(e.encounterId) ? { ...e, mode: 'DEFEATED' as const } : e,
      ),
    };

    this.fieldLayer = this.add.container(0, 0);
    const map = this.world.map;
    const { width, height } = mapSize(map);

    const g = this.add.graphics();
    map.rows.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        g.fillStyle(TILE_COLORS[ch] ?? PALETTE.rock, 1)
          .fillRect(c * map.tileSize, r * map.tileSize, map.tileSize, map.tileSize);
        if (ch === 'T') {
          g.fillStyle(0x163019, 1)
            .fillCircle((c + 0.5) * map.tileSize, (r + 0.5) * map.tileSize, map.tileSize * 0.42);
        }
        if (ch === '#') {
          g.fillStyle(0x5e5d55, 1)
            .fillRoundedRect(c * map.tileSize + 4, r * map.tileSize + 5, map.tileSize - 8, map.tileSize - 10, 6);
        }
        if (ch === ',') {
          g.lineStyle(1, 0x50613b, 0.65);
          const x = c * map.tileSize;
          const y = r * map.tileSize;
          g.lineBetween(x + 8, y + 24, x + 13, y + 10);
          g.lineBetween(x + 18, y + 25, x + 21, y + 12);
        }
      });
    });
    this.fieldLayer.add(g);

    this.marker = this.add.image(0, 0, 'marker-target').setVisible(false).setDepth(3);
    this.fieldLayer.add(this.marker);

    for (const secret of presentation.secretMarkers ?? []) {
      const marker = this.add.circle(secret.position.x, secret.position.y, 18, 0xc9a354, 0.18)
        .setStrokeStyle(2, 0xe4c778, 0.8)
        .setDepth(2);
      const label = this.add.text(secret.position.x, secret.position.y - 27, secret.label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#f6df9a',
        backgroundColor: '#1b1e17cc',
        padding: { x: 5, y: 2 },
      }).setOrigin(0.5).setDepth(4);
      this.secrets.set(secret.locationId, { marker, label });
      this.fieldLayer.add([marker, label]);
    }

    for (const e of this.world.enemies) {
      const ring = this.add.circle(e.pos.x, e.pos.y, e.aggroRadius, PALETTE.aggro, 0.08)
        .setStrokeStyle(2, PALETTE.aggro, 0.35)
        .setDepth(1);
      const body = this.add.image(e.pos.x, e.pos.y, 'token-enemy').setDepth(3);
      const alert = this.add.text(e.pos.x, e.pos.y - 34, '!', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: '24px',
        fontStyle: 'bold',
        color: '#ffd45e',
        stroke: '#000000',
        strokeThickness: 4,
      }).setOrigin(0.5).setDepth(4).setVisible(false);
      this.enemies.set(e.id, { body, ring, alert });
      this.fieldLayer.add([ring, body, alert]);
    }

    this.player = this.add.image(this.world.player.pos.x, this.world.player.pos.y, 'token-player').setDepth(3);
    this.fieldLayer.add(this.player);

    this.cameras.main.stopFollow();
    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.centerOn(this.world.player.pos.x, this.world.player.pos.y);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

    this.syncMeta([...this.discoveredLocationIds], [...this.defeatedEncounterIds]);
  }

  private syncMeta(discoveredLocationIds: readonly string[], defeatedEncounterIds: readonly string[]): void {
    this.discoveredLocationIds = new Set(discoveredLocationIds);
    this.defeatedEncounterIds = new Set(defeatedEncounterIds);

    this.world = {
      ...this.world,
      enemies: this.world.enemies.map((e) => {
        if (this.defeatedEncounterIds.has(e.encounterId)) return { ...e, mode: 'DEFEATED' as const };
        if (e.mode === 'DEFEATED') return { ...e, pos: { ...e.home }, mode: e.behavior, waypointIndex: 0 };
        return e;
      }),
    };

    for (const e of this.world.enemies) this.syncEnemy(e.id, e.mode);
    for (const [locationId, view] of this.secrets) {
      const visible = this.discoveredLocationIds.has(locationId);
      view.marker.setVisible(visible);
      view.label.setVisible(visible);
    }
  }

  private keyboardDirection(): Vec2 | null {
    if (!this.keys) return null;
    const x = (this.keys.right.isDown ? 1 : 0) - (this.keys.left.isDown ? 1 : 0);
    const y = (this.keys.down.isDown ? 1 : 0) - (this.keys.up.isDown ? 1 : 0);
    return x !== 0 || y !== 0 ? { x, y } : null;
  }

  private apply(result: { state: WorldState; events: WorldEvent[] }): void {
    this.world = result.state;
    for (const event of result.events) {
      if (event.type === 'AGGRO_CHANGED') {
        this.syncEnemy(event.enemyId, event.mode);
        this.bridge.runtime.emit('aggro-changed', {
          enemyId: event.enemyId,
          state: event.mode === 'DEFEATED' ? 'RETURN' : event.mode,
        });
      } else if (event.type === 'ENCOUNTER') {
        this.cameras.main.shake(180, 0.006);
        this.bridge.runtime.emit('encounter', { encounterId: event.encounterId, enemyId: event.enemyId });
      }
    }
  }

  private syncEnemy(enemyId: string, mode: EnemyMode): void {
    const view = this.enemies.get(enemyId);
    if (!view) return;
    const alerted = mode === 'CHASE' || mode === 'ENGAGED';
    view.body.setVisible(mode !== 'DEFEATED');
    view.ring.setVisible(mode !== 'DEFEATED');
    view.alert.setVisible(mode !== 'DEFEATED' && alerted);
    view.ring.setFillStyle(alerted ? 0xd04030 : PALETTE.aggro, alerted ? 0.14 : 0.08);
  }

  private cleanup(): void {
    this.unsubscribers.forEach((off) => off());
    this.unsubscribers = [];
  }

  /** ?debug=1 only: read-only state + field metadata + world->screen helper for E2E. */
  private installDebugHook(): void {
    const scene = this;
    (window as unknown as { __tkWorld?: unknown }).__tkWorld = {
      state: () => ({
        ...scene.world,
        locationId: scene.presentation.locationId,
        secretMarkers: [...scene.secrets].map(([locationId, view]) => ({
          locationId,
          visible: view.marker.visible,
        })),
      }),
      worldToClient(p: Vec2) {
        const cam = scene.cameras.main;
        const rect = scene.game.canvas.getBoundingClientRect();
        return {
          x: rect.left + (p.x - cam.worldView.x) * cam.zoom,
          y: rect.top + (p.y - cam.worldView.y) * cam.zoom,
        };
      },
    };
  }
}
