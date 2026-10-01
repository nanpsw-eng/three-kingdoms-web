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
import { PLACEHOLDER_ENEMIES, PLACEHOLDER_FIELD } from '../../world/placeholderField';
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

/** Max finger travel (px) for a pointer gesture to count as a tap rather than a drag. */
const TAP_SLOP = 12;
const MOVE_REPORT_MS = 250;

interface EnemyView {
  body: Phaser.GameObjects.Image;
  ring: Phaser.GameObjects.Arc;
  alert: Phaser.GameObjects.Text;
}

/**
 * Renders the pure-domain world simulation. Rules (movement, AI, encounter) live in
 * src/game/domain/world; this scene only converts input and draws state.
 */
export class WorldScene extends Phaser.Scene {
  private world!: WorldState;
  private player!: Phaser.GameObjects.Image;
  private marker!: Phaser.GameObjects.Image;
  private enemies = new Map<string, EnemyView>();
  private direction: Vec2 | null = null;
  private keys: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private lastReport = 0;
  private wasMoving = false;
  private unsubscribers: Array<() => void> = [];

  constructor(private readonly bridge: GameBridge) {
    super('World');
  }

  create(): void {
    this.world = createWorld(PLACEHOLDER_FIELD, PLACEHOLDER_ENEMIES);
    const map = this.world.map;
    const { width, height } = mapSize(map);

    const g = this.add.graphics();
    map.rows.forEach((row, r) => {
      [...row].forEach((ch, c) => {
        g.fillStyle(TILE_COLORS[ch] ?? PALETTE.rock, 1).fillRect(c * map.tileSize, r * map.tileSize, map.tileSize, map.tileSize);
        if (ch === 'T') g.fillStyle(0x163019, 1).fillCircle((c + 0.5) * map.tileSize, (r + 0.5) * map.tileSize, map.tileSize * 0.42);
        if (ch === '#') g.fillStyle(0x5e5d55, 1).fillRoundedRect(c * map.tileSize + 4, r * map.tileSize + 5, map.tileSize - 8, map.tileSize - 10, 6);
      });
    });

    this.marker = this.add.image(0, 0, 'marker-target').setVisible(false).setDepth(1);
    for (const e of this.world.enemies) {
      const ring = this.add.circle(e.pos.x, e.pos.y, e.aggroRadius, PALETTE.aggro, 0.08).setStrokeStyle(2, PALETTE.aggro, 0.35).setDepth(1);
      const body = this.add.image(e.pos.x, e.pos.y, 'token-enemy').setDepth(2);
      const alert = this.add.text(e.pos.x, e.pos.y - 34, '!', { fontFamily: 'system-ui, sans-serif', fontSize: '24px', fontStyle: 'bold', color: '#ffd45e', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(3).setVisible(false);
      this.enemies.set(e.id, { body, ring, alert });
    }
    this.player = this.add.image(this.world.player.pos.x, this.world.player.pos.y, 'token-player').setDepth(2);

    this.cameras.main.setBounds(0, 0, width, height);
    this.cameras.main.startFollow(this.player, true, 0.15, 0.15);

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
        const defeated = new Set(defeatedEncounterIds);
        this.world = { ...this.world, enemies: this.world.enemies.map((e) => (defeated.has(e.encounterId) ? { ...e, mode: 'DEFEATED' as const } : e)) };
        for (const e of this.world.enemies) if (e.mode === 'DEFEATED') this.syncEnemy(e.id, 'DEFEATED');
      }),
      this.bridge.ui.on('set-paused', ({ paused }) => {
        this.world = { ...this.world, paused };
      }),
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.unsubscribers.forEach((off) => off()));
    this.events.once(Phaser.Scenes.Events.DESTROY, () => this.unsubscribers.forEach((off) => off()));

    if (new URLSearchParams(window.location.search).has('debug')) this.installDebugHook();
    this.bridge.runtime.emit('scene-ready', { scene: 'World' });
  }

  override update(time: number, delta: number): void {
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
        this.bridge.runtime.emit('aggro-changed', { enemyId: event.enemyId, state: event.mode === 'DEFEATED' ? 'RETURN' : event.mode });
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
    view.alert.setVisible(alerted);
    view.ring.setFillStyle(alerted ? 0xd04030 : PALETTE.aggro, alerted ? 0.14 : 0.08);
    if (mode === 'DEFEATED') {
      view.body.setVisible(false);
      view.ring.setVisible(false);
      view.alert.setVisible(false);
    }
  }

  /** `?debug=1` only: read-only state + world->screen helper for E2E tests. */
  private installDebugHook(): void {
    const scene = this;
    (window as unknown as { __tkWorld?: unknown }).__tkWorld = {
      state: () => scene.world,
      worldToClient(p: Vec2) {
        const cam = scene.cameras.main;
        const rect = scene.game.canvas.getBoundingClientRect();
        return { x: rect.left + (p.x - cam.worldView.x) * cam.zoom, y: rect.top + (p.y - cam.worldView.y) * cam.zoom };
      },
    };
  }
}
