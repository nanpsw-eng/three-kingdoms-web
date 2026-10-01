import Phaser from 'phaser';
import type { GameBridge } from '../../runtime/bridge';
import { PALETTE } from '../palette';

/** N5 placeholder: draws a procedural field and a player token. Movement arrives in N6. */
export class WorldScene extends Phaser.Scene {
  constructor(private readonly bridge: GameBridge) {
    super('World');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add.rectangle(0, 0, width, height, PALETTE.grass).setOrigin(0);
    this.add.image(width / 2, height / 2, 'token-player');
    this.bridge.runtime.emit('scene-ready', { scene: 'World' });
  }
}
