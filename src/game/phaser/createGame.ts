import Phaser from 'phaser';
import type { GameBridge } from '../runtime/bridge';
import type { MountedRuntime } from '../runtime/controller';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { WorldScene } from './scenes/WorldScene';
import { PALETTE } from './palette';

export function createPhaserGame(parent: HTMLElement, bridge: GameBridge): MountedRuntime {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: PALETTE.background,
    scale: { mode: Phaser.Scale.RESIZE, width: parent.clientWidth || 360, height: parent.clientHeight || 480 },
    input: { activePointers: 2 },
    render: { antialias: true, pixelArt: false },
    banner: false,
    scene: [new BootScene(bridge), new PreloadScene(bridge), new WorldScene(bridge)],
  });
  return {
    destroy: () => game.destroy(true),
  };
}
