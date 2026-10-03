import { useEffect, useRef } from 'react';
import { GameController } from '../../game/runtime/controller';
import type { GameBridge } from '../../game/runtime/bridge';

interface Props {
  /** Called once the controller exists so the parent can subscribe to bridge events. */
  onBridge?: (bridge: GameBridge | null) => void;
  className?: string;
  label: string;
}

/** Mounts Phaser into a div and tears it down on unmount (StrictMode-safe). */
export function GameCanvas({ onBridge, className, label }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const onBridgeRef = useRef(onBridge);
  onBridgeRef.current = onBridge;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const controller = new GameController();
    onBridgeRef.current?.(controller.bridge);
    controller.mount(el).catch((error: unknown) => {
      controller.bridge.runtime.emit('runtime-error', { message: String(error) });
    });
    return () => {
      onBridgeRef.current?.(null);
      controller.destroy();
    };
  }, []);

  return <div ref={host} className={className} role="application" aria-label={label} data-testid="game-canvas" />;
}
