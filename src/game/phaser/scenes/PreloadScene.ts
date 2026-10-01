import Phaser from 'phaser';
import type { GameBridge } from '../../runtime/bridge';
import { PALETTE } from '../palette';

/** Generates placeholder textures procedurally; no external asset files are loaded. */
export class PreloadScene extends Phaser.Scene {
  constructor(private readonly bridge: GameBridge) {
    super('Preload');
  }

  create(): void {
    const g = this.add.graphics();
    const circle = (key: string, color: number, r: number) => {
      g.clear();
      g.fillStyle(0x000000, 0.35).fillCircle(r + 2, r + 4, r);
      g.fillStyle(color, 1).fillCircle(r, r, r);
      g.lineStyle(3, 0xffffff, 0.55).strokeCircle(r, r, r - 1.5);
      g.generateTexture(key, r * 2 + 4, r * 2 + 6);
    };
    circle('token-player', PALETTE.player, 18);
    circle('token-enemy', PALETTE.enemy, 18);
    g.clear();
    g.lineStyle(3, PALETTE.target, 0.9).strokeCircle(14, 14, 11);
    g.generateTexture('marker-target', 28, 28);
    g.destroy();

    this.bridge.runtime.emit('scene-ready', { scene: 'Preload' });
    this.scene.start('World');
  }
}
