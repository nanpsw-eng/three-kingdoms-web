import { GameBridge } from './bridge';

export interface MountedRuntime {
  destroy(): void;
}

/**
 * Owns the Phaser lifecycle for one React mount. Phaser is loaded lazily so the
 * app shell paints before the renderer bundle arrives. Safe under StrictMode
 * double-mount: destroy() before the async import resolves cancels creation.
 */
export class GameController {
  readonly bridge = new GameBridge();
  private runtime: MountedRuntime | null = null;
  private disposed = false;

  async mount(parent: HTMLElement): Promise<void> {
    const { createPhaserGame } = await import('../phaser/createGame');
    if (this.disposed) return;
    this.runtime = createPhaserGame(parent, this.bridge);
  }

  destroy(): void {
    this.disposed = true;
    this.runtime?.destroy();
    this.runtime = null;
    this.bridge.dispose();
  }

  get isMounted(): boolean {
    return this.runtime !== null;
  }
}
