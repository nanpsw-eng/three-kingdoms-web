import { useCallback, useEffect, useState } from 'react';
import { maxTroopsAt } from '../game/battle/fromContent';
import { createSession, type BattleSession } from '../game/battle/session';
import { dispatchTrigger } from '../game/domain/progress/index';
import type { AggroState, GameBridge, SceneKey } from '../game/runtime/bridge';
import { buildProgressContext } from '../game/progress/fromContent';
import { applyBattleResult } from '../game/save/applyBattle';
import { hasFieldPresentation } from '../game/world/fieldPresentations';
import {
  activeLocationEncounterIds,
  availableConnections,
  canSearchCurrentLocation,
  effectiveLocationServices,
  enterLocation,
  npcsAtCurrentLocation,
  restAtCurrentLocation,
  searchCurrentLocation,
  talkToNpc,
} from '../game/world/interaction';
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
  const [fieldDestinationId, setFieldDestinationId] = useState<string | null>(null);
  const [dpad, setDpad] = useState(false);
  const [locationSheet, setLocationSheet] = useState(false);
  const [dialogNpcId, setDialogNpcId] = useState<string | null>(null);
  const [interactionNotice, setInteractionNotice] = useState<string | null>(null);
  const [interactionError, setInteractionError] = useState<string | null>(null);

  const onBridge = useCallback((b: GameBridge | null) => setBridge(b), []);

  useEffect(() => {
    if (!bridge) return;
    const offs = [
      bridge.runtime.on('scene-ready', ({ scene: s }) => setScene(s)),
      bridge.runtime.on('encounter', (e) => setEncounter(e)),
      bridge.runtime.on('aggro-changed', ({ state }) => setAlert(state)),
      bridge.runtime.on('field-hotspot-changed', ({ destinationLocationId }) => {
        setFieldDestinationId(destinationLocationId);
      }),
    ];
    return () => offs.forEach((off) => off());
  }, [bridge]);

  useEffect(() => {
    if (bridge && save && scene === 'World') {
      bridge.ui.emit('sync-world', { defeatedEncounterIds: save.defeatedEncounterIds });
      if (hasFieldPresentation(save.world.locationId)) {
        bridge.ui.emit('set-field-location', {
          locationId: save.world.locationId!,
          discoveredLocationIds: save.discoveredLocationIds,
          defeatedEncounterIds: save.defeatedEncounterIds,
          availableDestinationIds: availableConnections(save, registry).map((location) => location.id),
        });
      }
    }
  }, [bridge, save, scene]);

  const currentLocation = save?.world.locationId ? registry.locations.get(save.world.locationId) : undefined;
  const isFieldLocation = hasFieldPresentation(currentLocation?.id);

  useEffect(() => {
    if (!bridge || scene !== 'World' || battle) return;
    bridge.ui.emit('set-paused', {
      paused: !isFieldLocation || Boolean(encounter) || locationSheet || Boolean(dialogNpcId),
    });
  }, [bridge, scene, battle, encounter, isFieldLocation, locationSheet, dialogNpcId]);

  const selectFormation = (formationId: string) => {
    game.commit((s) => ({ ...s, party: { ...s.party, formationId } }));
  };

  const retreatFromField = () => {
    bridge?.ui.emit('resume-world', { defeatedEnemyId: null });
    setEncounter(null);
  };

  const beginLocationEncounter = (encounterId: string) => {
    setLocationSheet(false);
    setEncounter({ encounterId, enemyId: 'LOCATION:' + encounterId });
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
      battleId: encounter.encounterId + ':' + session.seed,
      units: session.state.combatants.map((c) => ({
        id: c.id,
        side: c.side,
        slot: c.slot,
        label: nameOf(registry, t, c.id).replace(/^황건\s*/, '').slice(0, 2),
        troops: c.troops,
        maxTroops: c.maxTroops,
        unitType: c.unitType,
      })),
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

  const travelTo = (destinationId: string) => {
    if (!save) return;
    try {
      const result = enterLocation(save, registry, destinationId);
      game.commit(() => result.save);
      const destination = registry.locations.get(destinationId);
      setLocationSheet(false);
      setDialogNpcId(null);
      setEncounter(null);
      setAlert(null);
      setFieldDestinationId(null);
      setInteractionError(null);
      setInteractionNotice(destination ? t(destination.nameKey) + '에 도착했습니다.' : null);
    } catch (error) {
      setInteractionError(String(error));
    }
  };

  const talkNpc = (npcId: string) => {
    if (!save) return;
    try {
      const result = talkToNpc(save, registry, npcId);
      game.commit(() => result.save);
      setDialogNpcId(npcId);
      setInteractionError(null);
      const recruited = result.log.find((entry) => entry.kind === 'RECRUITED');
      setInteractionNotice(recruited ? nameOf(registry, t, recruited.id) + '이(가) 합류했습니다.' : null);
    } catch (error) {
      setInteractionError(String(error));
    }
  };

  const restParty = () => {
    if (!save) return;
    try {
      const result = restAtCurrentLocation(save, registry);
      game.commit(() => result.save);
      setInteractionError(null);
      setInteractionNotice('부대의 병력을 정비했습니다.');
    } catch (error) {
      setInteractionError(String(error));
    }
  };

  const searchArea = () => {
    if (!save) return;
    try {
      const result = searchCurrentLocation(save, registry);
      game.commit(() => result.save);
      setInteractionError(null);
      setInteractionNotice(
        result.discoveredLocationIds.length > 0 ? t('world.search.found') : t('world.search.none'),
      );
    } catch (error) {
      setInteractionError(String(error));
    }
  };

  const mode = battle ? 'battle' : 'world';
  const availableFormations = (save?.unlockedFormationIds ?? [])
    .map((id) => registry.formations.get(id))
    .filter((f): f is NonNullable<typeof f> => Boolean(f));
  const quest = registry.quests.get('QST_MAIN_ZHUO_YELLOW_TURBAN');
  const progress = save?.quests['QST_MAIN_ZHUO_YELLOW_TURBAN'];
  const objective = !quest || !progress
    ? '…'
    : progress.status === 'COMPLETED'
      ? '탁군의 황건적을 몰아냈다. (다음 지역 준비 중)'
      : t(quest.steps[progress.stepIndex]?.objectiveKey ?? '');

  const currentNpcs = save ? npcsAtCurrentLocation(save, registry) : [];
  const currentServices = save && currentLocation ? effectiveLocationServices(save, registry, currentLocation.id) : [];
  const connections = save ? availableConnections(save, registry) : [];
  const currentThreats = save && currentLocation && !isFieldLocation
    ? activeLocationEncounterIds(save, registry)
    : [];
  const canSearch = save ? canSearchCurrentLocation(save, registry) : false;
  const dialogNpc = dialogNpcId ? registry.npcs.get(dialogNpcId) : undefined;

  return (
    <main
      className={'app-shell mode-' + mode}
      data-scene={scene ?? 'loading'}
      data-encounter={encounter?.encounterId ?? ''}
      data-save={game.status}
      data-location={currentLocation?.id ?? ''}
      data-checkpoint={save?.world.checkpointId ?? ''}
    >
      {mode === 'world' && (
        <header className="topbar">
          <div>
            <p className="eyebrow">황건적의 난</p>
            <h1>{currentLocation ? t(currentLocation.nameKey) : '탁군'}</h1>
          </div>
          <button className="icon-button" type="button" aria-label="설정">☰</button>
        </header>
      )}

      <section className="world-card" aria-label={mode === 'battle' ? '전장' : '게임 월드'}>
        <GameCanvas className="game-host" label={mode === 'battle' ? '전장 화면' : '필드 지도. 이동할 곳을 터치하세요.'} onBridge={onBridge} />
        {mode === 'world' && (
          <>
            <div className="map-label">{currentLocation ? t(currentLocation.nameKey) : '탁군'}</div>

            {isFieldLocation && alert === 'CHASE' && !encounter && (
              <div className="aggro-banner" role="status">! 황건군이 추격 중</div>
            )}

            {isFieldLocation && (
              <>
                <button
                  type="button"
                  className={'dpad-toggle' + (dpad ? ' on' : '')}
                  aria-pressed={dpad}
                  aria-label="가상 방향키 사용"
                  onClick={() => setDpad((v) => !v)}
                >
                  ✥
                </button>
                {dpad && <VirtualDpad bridge={bridge} />}
                {scene !== 'World' && <p className="hint">불러오는 중…</p>}
                {scene === 'World' && !encounter && <p className="hint">이동할 곳을 터치하세요</p>}
              </>
            )}

            {!isFieldLocation && currentLocation && !encounter && (
              <div className="location-surface">
                <p className="eyebrow">현재 위치</p>
                <h2>{t(currentLocation.nameKey)}</h2>
                <p>{currentNpcs.length > 0 ? '만날 수 있는 인물 ' + currentNpcs.length + '명' : '주변을 살펴볼 수 있습니다.'}</p>
                {currentServices.includes('SAVE_POINT') && <span className="service-badge">안전 거점</span>}
                {currentServices.includes('REST') && <span className="service-badge">휴식 가능</span>}
                <button type="button" className="primary location-open" onClick={() => setLocationSheet(true)}>
                  장소 살펴보기
                </button>
              </div>
            )}

            {isFieldLocation && fieldDestinationId && !encounter && (
              <button
                type="button"
                className="field-hotspot-action"
                onClick={() => travelTo(fieldDestinationId)}
                aria-label={'필드 이동: ' + t(registry.locations.get(fieldDestinationId)?.nameKey ?? fieldDestinationId)}
              >
                {'이동 · ' + t(registry.locations.get(fieldDestinationId)?.nameKey ?? fieldDestinationId)}
              </button>
            )}

            {encounter && (
              <div className="encounter-sheet" role="dialog" aria-label="적과 조우">
                <strong>{t(registry.encounters.get(encounter.encounterId)?.nameKey ?? '')}와 마주쳤다!</strong>
                {save && availableFormations.length > 0 && (
                  <div className="formation-picker" role="group" aria-label="전투 진형 선택">
                    <span>진형</span>
                    <div>
                      {availableFormations.map((formation) => (
                        <button
                          key={formation.id}
                          type="button"
                          aria-pressed={save.party.formationId === formation.id}
                          className={save.party.formationId === formation.id ? 'selected' : ''}
                          onClick={() => selectFormation(formation.id)}
                        >
                          {t(formation.nameKey)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
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
                <article className="general" key={id} aria-label={n + ' 병력 ' + g.currentTroops + ' / ' + max}>
                  <div className="portrait-placeholder" aria-hidden="true">{n[0]}</div>
                  <div className="general-info" aria-hidden="true">
                    <strong>{n}</strong>
                    <span>{g.currentTroops.toLocaleString('ko-KR')}</span>
                    <span className="mini-bar"><span style={{ width: Math.round((g.currentTroops / max) * 100) + '%' }} /></span>
                  </div>
                </article>
              );
            })}
          </section>

          {interactionNotice && <p className="interaction-notice" role="status">{interactionNotice}</p>}
          {(game.error || interactionError) && <p className="save-error" role="alert">{interactionError ?? game.error}</p>}

          <nav className="bottom-nav" aria-label="주요 메뉴">
            <button type="button">부대</button>
            <button type="button" className="primary" onClick={() => !isFieldLocation && setLocationSheet(true)}>탐험</button>
            <button type="button" onClick={() => setLocationSheet(true)}>지도</button>
          </nav>
        </>
      )}

      {locationSheet && save && currentLocation && !battle && !encounter && (
        <section className="location-sheet" role="dialog" aria-label="지역 정보">
          <div className="sheet-heading">
            <div>
              <p className="eyebrow">현재 위치</p>
              <strong>{t(currentLocation.nameKey)}</strong>
            </div>
            <button type="button" className="sheet-close" aria-label="지역 정보 닫기" onClick={() => setLocationSheet(false)}>×</button>
          </div>

          {currentNpcs.length > 0 && (
            <div className="location-group">
              <span>인물</span>
              <div className="location-buttons">
                {currentNpcs.map((npc) => (
                  <button type="button" key={npc.id} onClick={() => talkNpc(npc.id)}>
                    {t(npc.nameKey)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentServices.length > 0 && (
            <div className="location-group">
              <span>시설</span>
              <div className="location-buttons">
                {currentServices.includes('REST') && <button type="button" onClick={restParty}>휴식 · 병력 정비</button>}
                {currentServices.includes('SAVE_POINT') && <button type="button" disabled>안전 거점 · 자동저장</button>}
                {currentServices.includes('SHOP') && <button type="button" disabled>상점 · 준비 중</button>}
              </div>
            </div>
          )}

          {currentThreats.length > 0 && (
            <div className="location-group">
              <span>적 부대</span>
              <div className="location-buttons danger">
                {currentThreats.map((encounterId) => (
                  <button type="button" key={encounterId} onClick={() => beginLocationEncounter(encounterId)}>
                    {'전투: ' + t(registry.encounters.get(encounterId)?.nameKey ?? encounterId)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {canSearch && (
            <div className="location-group">
              <span>탐색</span>
              <div className="location-buttons explore">
                <button type="button" onClick={searchArea}>{t('world.search.action')}</button>
              </div>
            </div>
          )}

          <div className="location-group">
            <span>이동</span>
            <div className="location-buttons">
              {connections.map((location) => (
                <button
                  type="button"
                  key={location.id}
                  onClick={() => travelTo(location.id)}
                  aria-label={'이동: ' + t(location.nameKey)}
                >
                  {t(location.nameKey)}
                </button>
              ))}
              {connections.length === 0 && <small>현재 이동 가능한 장소가 없습니다.</small>}
            </div>
          </div>
        </section>
      )}

      {dialogNpc && (
        <section className="dialog-sheet" role="dialog" aria-label="대화">
          <p className="eyebrow">{t(dialogNpc.nameKey)}</p>
          <p>{t(dialogNpc.lineKey)}</p>
          <button type="button" className="primary" onClick={() => setDialogNpcId(null)}>확인</button>
        </section>
      )}
    </main>
  );
}
