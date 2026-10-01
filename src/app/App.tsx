import { useCallback, useEffect, useState } from 'react';
import { maxTroopsAt } from '../game/battle/fromContent';
import { createSession, type BattleSession } from '../game/battle/session';
import type { AggroState, GameBridge, SceneKey } from '../game/runtime/bridge';
import { applyBattleResult } from '../game/save/applyBattle';
import { dispatchTrigger } from '../game/domain/progress/index';
import { buildProgressContext } from '../game/progress/fromContent';
import { BattleScreen, nameOf } from './components/BattleScreen';
import { GameCanvas } from './components/GameCanvas';
import { VirtualDpad } from './components/VirtualDpad';
import { useGame } from './game/useGame';

interface Encounter {
  encounterId: string;
  enemyId: string;
}

function randomSeed(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0]!;
}

export function App() {
  const game = useGame();
  const { registry, save, t } = game;
  const [bridge, setBridge] = useState<GameBridge | null>(null);
  const [scene, setScene] = useState<SceneKey | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [battle, setBattle] = useState<BattleSession | null>(null);
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

  // Keep the field in sync with persisted world state (defeated encounters stay defeated after reload).
  useEffect(() => {
    if (bridge && save && scene === 'World') bridge.ui.emit('sync-world', { defeatedEncounterIds: save.defeatedEncounterIds });
  }, [bridge, save, scene]);

  const retreatFromField = () => {
    bridge?.ui.emit('resume-world', { defeatedEnemyId: null });
    setEncounter(null);
  };

  const startBattle = () => {
    if (!encounter || !save) return;
    const party = save.party.activeGeneralIds.map((id) => ({
      generalId: id,
      level: save.generals[id]!.level,
      troops: save.generals[id]!.currentTroops,
      tacticIds: save.generals[id]!.learnedTacticIds,
    }));
    const session = createSession(registry, encounter.encounterId, party, randomSeed(), save.party.formationId);
    setBattle(session);
    bridge?.ui.emit('start-battle-view', {
      battleId: `${encounter.encounterId}:${session.seed}`,
      units: session.state.combatants.map((c) => ({ id: c.id, side: c.side, slot: c.slot, label: nameOf(registry, t, c.id).replace(/^황건\s*/, '').slice(0, 2), troops: c.troops, maxTroops: c.maxTroops, unitType: c.unitType })),
    });
  };

  const finishBattle = (finished: BattleSession) => {
    game.commit((s) => {
      const after = applyBattleResult(s, finished, registry, new Date().toISOString());
      return finished.result === 'VICTORY'
        ? dispatchTrigger(after, buildProgressContext(registry), { type: 'ENCOUNTER_VICTORY', encounterId: finished.encounterId }).save
        : after;
    });
    bridge?.ui.emit('end-battle-view', {});
    bridge?.ui.emit('resume-world', { defeatedEnemyId: finished.result === 'VICTORY' ? encounter?.enemyId ?? null : null });
    setBattle(null);
    setEncounter(null);
    setAlert(null);
  };

  const mode = battle ? 'battle' : 'world';
  const quest = registry.quests.get('QST_MAIN_ZHUO_YELLOW_TURBAN');
  const progress = save?.quests['QST_MAIN_ZHUO_YELLOW_TURBAN'];
  const objective = !quest || !progress ? '…' : progress.status === 'COMPLETED' ? '탁군의 황건적을 몰아냈다. (다음 지역 준비 중)' : t(quest.steps[progress.stepIndex]?.objectiveKey ?? '');

  return (
    <main className={`app-shell mode-${mode}`} data-scene={scene ?? 'loading'} data-encounter={encounter?.encounterId ?? ''} data-save={game.status}>
      {mode === 'world' && (
        <header className="topbar">
          <div>
            <p className="eyebrow">황건적의 난</p>
            <h1>탁군</h1>
          </div>
          <button className="icon-button" type="button" aria-label="설정">☰</button>
        </header>
      )}

      <section className="world-card" aria-label={mode === 'battle' ? '전장' : '게임 월드'}>
        <GameCanvas className="game-host" label={mode === 'battle' ? '전장 화면' : '필드 지도. 이동할 곳을 터치하세요.'} onBridge={onBridge} />
        {mode === 'world' && (
          <>
            <div className="map-label">탁현 남부 평야</div>
            {alert === 'CHASE' && !encounter && <div className="aggro-banner" role="status">! 황건군이 추격 중</div>}
            <button type="button" className={`dpad-toggle${dpad ? ' on' : ''}`} aria-pressed={dpad} aria-label="가상 방향키 사용" onClick={() => setDpad((v) => !v)}>✥</button>
            {dpad && <VirtualDpad bridge={bridge} />}
            {scene !== 'World' && <p className="hint">불러오는 중…</p>}
            {scene === 'World' && !encounter && <p className="hint">이동할 곳을 터치하세요</p>}
            {encounter && (
              <div className="encounter-sheet" role="dialog" aria-label="적과 조우">
                <strong>{t(registry.encounters.get(encounter.encounterId)?.nameKey ?? '')}와 마주쳤다!</strong>
                <div className="encounter-actions">
                  <button type="button" className="primary" onClick={startBattle} disabled={!save}>전투</button>
                  <button type="button" onClick={retreatFromField}>후퇴</button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {battle ? (
        <BattleScreen key={battle.seed} session={battle} registry={registry} bridge={bridge} t={t} onFinish={finishBattle} />
      ) : (
        <>
          <section className="quest-card">
            <p className="eyebrow">현재 목표</p>
            <strong data-testid="quest-objective">{objective}</strong>
          </section>

          <section className="party-card" aria-label="현재 부대">
            {save?.party.activeGeneralIds.map((id) => {
              const g = save.generals[id]!;
              const n = nameOf(registry, t, id);
              const max = maxTroopsAt(registry, id, g.level);
              return (
                <article className="general" key={id} aria-label={`${n} 병력 ${g.currentTroops} / ${max}`}>
                  <div className="portrait-placeholder" aria-hidden="true">{n[0]}</div>
                  <div className="general-info" aria-hidden="true">
                    <strong>{n}</strong>
                    <span>{g.currentTroops.toLocaleString('ko-KR')}</span>
                    <span className="mini-bar"><span style={{ width: `${Math.round((g.currentTroops / max) * 100)}%` }} /></span>
                  </div>
                </article>
              );
            })}
          </section>
          {game.error && <p className="save-error" role="alert">{game.error}</p>}

          <nav className="bottom-nav" aria-label="주요 메뉴">
            <button type="button">부대</button>
            <button type="button" className="primary">탐험</button>
            <button type="button">지도</button>
          </nav>
        </>
      )}
    </main>
  );
}
