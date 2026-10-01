import { useEffect, useRef } from 'react';
import type { GameBridge } from '../../game/runtime/bridge';

const DIRS = [
  { key: 'up', label: '위로 이동', glyph: '▲', dx: 0, dy: -1 },
  { key: 'left', label: '왼쪽으로 이동', glyph: '◀', dx: -1, dy: 0 },
  { key: 'right', label: '오른쪽으로 이동', glyph: '▶', dx: 1, dy: 0 },
  { key: 'down', label: '아래로 이동', glyph: '▼', dx: 0, dy: 1 },
] as const;

/** Optional virtual d-pad (Tap-to-Move stays the default). Press-and-hold, touch only, no hover. */
export function VirtualDpad({ bridge }: { bridge: GameBridge | null }) {
  const active = useRef<string | null>(null);

  useEffect(() => () => bridge?.ui.emit('move-direction', null), [bridge]);

  const release = () => {
    active.current = null;
    bridge?.ui.emit('move-direction', null);
  };

  return (
    <div className="dpad" role="group" aria-label="가상 방향키">
      {DIRS.map((d) => (
        <button
          key={d.key}
          type="button"
          className={`dpad-${d.key}`}
          aria-label={d.label}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            active.current = d.key;
            bridge?.ui.emit('move-direction', { dx: d.dx, dy: d.dy });
          }}
          onPointerUp={release}
          onPointerCancel={release}
          onContextMenu={(e) => e.preventDefault()}
        >
          {d.glyph}
        </button>
      ))}
    </div>
  );
}
