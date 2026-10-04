import Phaser from 'phaser';
import type { GameBridge } from '../../runtime/bridge';

export class BootScene extends Phaser.Scene {
  constructor(private readonly bridge: GameBridge) {
    super('Boot');
  }

  create(): void {
    this.bridge.runtime.emit('scene-ready', { scene: 'Boot' });
    this.scene.start('Preload');
  }
}
