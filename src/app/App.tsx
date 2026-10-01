import { useCallback, useEffect, useState } from 'react';
import type { GameBridge, SceneKey } from '../game/runtime/bridge';
import { GameCanvas } from './components/GameCanvas';

const party = [
  ['유비', '1,100'],
  ['관우', '1,200'],
  ['장비', '1,250'],
];

export function App() {
  const [bridge, setBridge] = useState<GameBridge | null>(null);
  const [scene, setScene] = useState<SceneKey | null>(null);

  const onBridge = useCallback((b: GameBridge | null) => setBridge(b), []);

  useEffect(() => {
    if (!bridge) return;
    return bridge.runtime.on('scene-ready', ({ scene: s }) => setScene(s));
  }, [bridge]);

  return (
    <main className="app-shell" data-scene={scene ?? 'loading'}>
      <header className="topbar">
        <div>
          <p className="eyebrow">황건적의 난</p>
          <h1>탁군</h1>
        </div>
        <button className="icon-button" type="button" aria-label="설정">☰</button>
      </header>

      <section className="world-card" aria-label="게임 월드">
        <GameCanvas className="game-host" label="필드 지도" onBridge={onBridge} />
        <div className="map-label">탁현 남부 평야</div>
        {scene !== 'World' && <p className="hint">불러오는 중…</p>}
      </section>

      <section className="quest-card">
        <p className="eyebrow">현재 목표</p>
        <strong>탁현 남쪽의 황건군 움직임을 확인하십시오.</strong>
      </section>

      <section className="party-card" aria-label="현재 부대">
        {party.map(([name, troops]) => (
          <article className="general" key={name}>
            <div className="portrait-placeholder" aria-hidden="true">{name![0]}</div>
            <div>
              <strong>{name}</strong>
              <span>병력 {troops}</span>
            </div>
          </article>
        ))}
      </section>

      <nav className="bottom-nav" aria-label="주요 메뉴">
        <button type="button">부대</button>
        <button type="button" className="primary">탐험</button>
        <button type="button">지도</button>
      </nav>
    </main>
  );
}
