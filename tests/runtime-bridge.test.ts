import { describe, expect, it, vi } from 'vitest';
import { GameBridge } from '../src/game/runtime/bridge';
import { GameController } from '../src/game/runtime/controller';

describe('GameBridge', () => {
  it('delivers typed runtime events and supports unsubscribe', () => {
    const bridge = new GameBridge();
    const seen: string[] = [];
    const off = bridge.runtime.on('encounter', (e) => seen.push(e.enemyId));
    bridge.runtime.emit('encounter', { encounterId: 'ENC_A', enemyId: 'E1' });
    off();
    bridge.runtime.emit('encounter', { encounterId: 'ENC_A', enemyId: 'E2' });
    expect(seen).toEqual(['E1']);
  });

  it('dispose removes every listener', () => {
    const bridge = new GameBridge();
    bridge.ui.on('set-paused', vi.fn());
    bridge.runtime.on('scene-ready', vi.fn());
    bridge.dispose();
    expect(bridge.ui.listenerCount() + bridge.runtime.listenerCount()).toBe(0);
  });

  it('controller destroyed before mount resolves never creates a game', async () => {
    const controller = new GameController();
    const parent = {} as HTMLElement;
    const pending = controller.mount(parent).catch(() => undefined);
    controller.destroy();
    await pending;
    expect(controller.isMounted).toBe(false);
  });
});
