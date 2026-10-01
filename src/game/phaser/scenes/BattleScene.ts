import Phaser from 'phaser';
import type { BattleEvent } from '../../domain/battle/types';
import type { BattleUnitView, GameBridge } from '../../runtime/bridge';
import { PALETTE } from '../palette';

interface UnitSprite {
  view: BattleUnitView;
  container: Phaser.GameObjects.Container;
  bar: Phaser.GameObjects.Rectangle;
  troops: number;
}

/** Base duration of one visual beat at x1. Speed only divides this; results come from the domain. */
const BEAT_MS = 420;
const BAR_W = 52;

/**
 * Battle rendering placeholder. Receives domain events already resolved by the
 * pure battle core and only animates them. It never decides outcomes.
 */
export class BattleScene extends Phaser.Scene {
  private units = new Map<string, UnitSprite>();
  private queue: Array<{ turn: number; events: readonly BattleEvent[]; speed: number }> = [];
  private playing = false;
  private offPlay: (() => void) | null = null;

  constructor(private readonly bridge: GameBridge) {
    super('Battle');
  }

  init(data: { units: readonly BattleUnitView[] }): void {
    this.units.clear();
    this.queue = [];
    this.playing = false;
    this.pendingUnits = data.units ?? [];
  }

  private pendingUnits: readonly BattleUnitView[] = [];

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, 0x23301f).setOrigin(0);
    this.add.rectangle(0, height / 2 - 1, width, 2, 0xffffff, 0.08).setOrigin(0);
    for (const view of this.pendingUnits) this.createUnit(view);
    this.layout();
    this.scale.on('resize', this.layout, this);

    this.offPlay = this.bridge.ui.on('play-battle-events', (batch) => {
      this.queue.push(batch);
      if (!this.playing) void this.drain();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.offPlay?.();
      this.scale.off('resize', this.layout, this);
    });
    this.bridge.runtime.emit('scene-ready', { scene: 'Battle' });
  }

  private createUnit(view: BattleUnitView): void {
    const color = view.side === 'PLAYER' ? PALETTE.player : PALETTE.enemy;
    const body = this.add.circle(0, 0, 22, color).setStrokeStyle(3, 0xffffff, 0.5);
    const label = this.add.text(0, 0, view.label, { fontFamily: 'system-ui, sans-serif', fontSize: '18px', fontStyle: 'bold', color: '#ffffff' }).setOrigin(0.5);
    const unitMark = this.add.text(0, -34, view.unitType === 'SPEAR' ? '창' : view.unitType === 'CAVALRY' ? '기' : '궁', { fontFamily: 'system-ui, sans-serif', fontSize: '11px', color: '#e9e0cf' }).setOrigin(0.5);
    const barBg = this.add.rectangle(-BAR_W / 2, 30, BAR_W, 6, 0x000000, 0.6).setOrigin(0, 0.5);
    const bar = this.add.rectangle(-BAR_W / 2, 30, BAR_W * (view.troops / view.maxTroops), 6, view.side === 'PLAYER' ? 0x7fc8ff : 0xff9f7f).setOrigin(0, 0.5);
    const container = this.add.container(0, 0, [body, label, unitMark, barBg, bar]);
    if (view.troops <= 0) container.setAlpha(0.25);
    this.units.set(view.id, { view, container, bar, troops: view.troops });
  }

  private layout(): void {
    const { width, height } = this.scale;
    for (const side of ['ENEMY', 'PLAYER'] as const) {
      const members = [...this.units.values()].filter((u) => u.view.side === side).sort((a, b) => a.view.slot - b.view.slot);
      const y = side === 'ENEMY' ? height * 0.27 : height * 0.73;
      members.forEach((u, i) => {
        const x = (width / (members.length + 1)) * (i + 1);
        const stagger = i % 2 === 0 ? 0 : side === 'ENEMY' ? -16 : 16;
        u.container.setPosition(x, y + stagger);
      });
    }
  }

  private async drain(): Promise<void> {
    this.playing = true;
    while (this.queue.length > 0) {
      const batch = this.queue.shift()!;
      for (const event of batch.events) await this.playEvent(event, batch.speed);
      this.bridge.runtime.emit('battle-playback-done', { turn: batch.turn });
    }
    this.playing = false;
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  private floatText(x: number, y: number, text: string, color: string, speed: number): void {
    const t = this.add.text(x, y, text, { fontFamily: 'system-ui, sans-serif', fontSize: '16px', fontStyle: 'bold', color, stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(10);
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: (BEAT_MS * 1.6) / speed, onComplete: () => t.destroy() });
  }

  private setTroops(unit: UnitSprite, troops: number, speed: number): void {
    unit.troops = troops;
    this.tweens.add({ targets: unit.bar, width: Math.max(0, BAR_W * (troops / unit.view.maxTroops)), duration: BEAT_MS / 2 / speed });
  }

  private async playEvent(event: BattleEvent, speed: number): Promise<void> {
    const beat = BEAT_MS / speed;
    switch (event.type) {
      case 'DAMAGE': {
        const actor = this.units.get(event.actorId);
        const target = this.units.get(event.targetId);
        if (!actor || !target) return;
        const dir = actor.view.side === 'PLAYER' ? -1 : 1;
        this.tweens.add({ targets: actor.container, y: actor.container.y + dir * 14, yoyo: true, duration: beat / 3 });
        await this.wait(beat / 3);
        this.tweens.add({ targets: target.container, alpha: 0.4, yoyo: true, duration: beat / 6 });
        this.floatText(target.container.x, target.container.y - 20, `-${event.amount}`, event.tacticId ? '#ffb057' : '#ffffff', speed);
        this.setTroops(target, Math.max(0, target.troops - event.amount), speed);
        await this.wait((beat * 2) / 3);
        return;
      }
      case 'HEAL': {
        const target = this.units.get(event.targetId);
        if (!target) return;
        this.floatText(target.container.x, target.container.y - 20, `+${event.amount}`, '#8dff9a', speed);
        this.setTroops(target, Math.min(target.view.maxTroops, target.troops + event.amount), speed);
        await this.wait(beat);
        return;
      }
      case 'STATUS_APPLIED':
      case 'STATUS_RESISTED': {
        const target = this.units.get(event.targetId);
        const label = event.type === 'STATUS_RESISTED' ? '저항' : event.status === 'CONFUSED' ? '혼란' : event.status === 'INSPIRED' ? '고무' : '도발';
        if (target) this.floatText(target.container.x, target.container.y - 40, label, '#ffe27a', speed);
        await this.wait(beat / 2);
        return;
      }
      case 'ROUT': {
        const target = this.units.get(event.targetId);
        if (target) this.tweens.add({ targets: target.container, alpha: 0.25, duration: beat / 2 });
        await this.wait(beat / 2);
        return;
      }
      case 'ACTION_SKIPPED': {
        const actor = this.units.get(event.actorId);
        if (actor) this.floatText(actor.container.x, actor.container.y - 40, '혼란', '#c9a0ff', speed);
        await this.wait(beat / 2);
        return;
      }
      default:
        return;
    }
  }
}
