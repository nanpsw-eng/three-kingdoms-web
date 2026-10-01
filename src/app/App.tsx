import { useCallback, useEffect, useState } from 'react';
import type { AggroState, GameBridge, SceneKey } from '../game/runtime/bridge';
import { GameCanvas } from './components/GameCanvas';
import { VirtualDpad } from './components/VirtualDpad';

const party = [
  ['유비', '1,100'],
  ['관우', '1,200'],
  ['장비', '1,250'],
];

interface Encounter {
  encounterId: string;
  enemyId: string;
}

export function App() {
  const [bridge, setBridge] = useState<GameBridge | null>(null);
  const [scene, setScene] = useState<SceneKey | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [alert, setAlert] = useState<AggroState | null>(null);
  const [dpad, setDpad] = useState(false);

  const onBridge = useCallback((b: GameBridge | null) => setBridge(b), []);

  useEffect(() => {
    if (!bridge) return;
    const offs = [
      bridge.runtime.on('scene-ready', ({ scene: s }) => setScene(s)),
      bridge.runtime.on('encounter', (e) => setEncounter(e)),
      bridge.runtime.on('aggro-changed', ({ state }) => setAlert(state)),
    ];
    return () => offs.forEach((off) => off());
  }, [bridge]);

  const retreat = () => {
    bridge?.ui.emit('resume-world', { defeatedEnemyId: null });
    setEncounter(null);
  };

  return (
    <main className="app-shell" data-scene={scene ?? 'loading'} data-encounter={encounter?.encounterId ?? ''}>
      <header className="topbar">
        <div>
          <p className="eyebrow">황건적의 난</p>
          <h1>탁군</h1>
        </div>
        <button className="icon-button" type="button" aria-label="설정">☰</button>
      </header>

      <section className="world-card" aria-label="게임 월드">
        <GameCanvas className="game-host" label="필드 지도. 이동할 곳을 터치하세요." onBridge={onBridge} />
        <div className="map-label">탁현 남부 평야</div>
        {alert === 'CHASE' && !encounter && <div className="aggro-banner" role="status">! 황건군이 추격 중</div>}
        <button
          type="button"
          className={`dpad-toggle${dpad ? ' on' : ''}`}
          aria-pressed={dpad}
          aria-label="가상 방향키 사용"
          onClick={() => setDpad((v) => !v)}
        >
          ✥
        </button>
        {dpad && <VirtualDpad bridge={bridge} />}
        {scene !== 'World' && <p className="hint">불러오는 중…</p>}
        {scene === 'World' && !encounter && <p className="hint">이동할 곳을 터치하세요</p>}
        {encounter && (
          <div className="encounter-sheet" role="dialog" aria-label="적과 조우">
            <strong>황건군 정찰대와 마주쳤다!</strong>
            <div className="encounter-actions">
              <button type="button" className="primary" disabled>전투 (준비 중)</button>
              <button type="button" onClick={retreat}>후퇴</button>
            </div>
          </div>
        )}
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
