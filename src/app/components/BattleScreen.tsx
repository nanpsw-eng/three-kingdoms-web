import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { activeTelegraph, executeTurn, resetPlan, retreat, setCommand, type BattleSession, type PlaybackSpeed } from '../../game/battle/session';
import type { ContentRegistry } from '../../game/content/registry';
import type { BattleCommand, Combatant, TurnResult } from '../../game/domain/battle/index';
import type { GameBridge } from '../../game/runtime/bridge';

interface Props {
  session: BattleSession;
  registry: ContentRegistry;
  bridge: GameBridge | null;
  t(key: string): string;
  onFinish(session: BattleSession): void;
}

type Pick = { actorId: string; kind: 'ATTACK' } | { actorId: string; kind: 'TACTIC'; tacticId: string };

/** Max time to wait for Phaser playback before continuing anyway (renderer must never block rules). */
const PLAYBACK_TIMEOUT_MS = 8000;

export function nameOf(registry: ContentRegistry, t: (k: string) => string, id: string): string {
  const g = registry.generals.get(id);
  return g ? t(g.nameKey) : id;
}

export function BattleScreen({ session: initial, registry, bridge, t, onFinish }: Props) {
  const [session, setSession] = useState(initial);
  const [shown, setShown] = useState(initial); // state as currently rendered (lags during playback)
  const [busy, setBusy] = useState(false);
  const [sheetFor, setSheetFor] = useState<string | null>(null);
  const [picking, setPicking] = useState<Pick | null>(null);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [auto, setAuto] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [lastTurn, setLastTurn] = useState<TurnResult | null>(null);
  const pending = useRef<{ turn: number; session: BattleSession } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const name = useCallback((id: string) => nameOf(registry, t, id), [registry, t]);
  const tacticName = useCallback((id: string) => t(registry.tactics.get(id)?.nameKey ?? id), [registry, t]);

  const finishPlayback = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    const p = pending.current;
    pending.current = null;
    if (!p) return;
    setShown(p.session);
    setBusy(false);
  }, []);

  useEffect(() => {
    if (!bridge) return;
    return bridge.runtime.on('battle-playback-done', ({ turn }) => {
      if (pending.current?.turn === turn) finishPlayback();
    });
  }, [bridge, finishPlayback]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const run = useCallback((base: BattleSession) => {
    if (busy || base.result !== 'ONGOING') return;
    const { session: next, turn } = executeTurn(base, repeat ? 'REPEAT' : 'SMART');
    setSession(next);
    setLastTurn(turn);
    setSheetFor(null);
    setPicking(null);
    setBusy(true);
    pending.current = { turn: base.state.turn, session: next };
    if (bridge) {
      bridge.ui.emit('play-battle-events', { turn: base.state.turn, events: turn.events, speed });
      timer.current = setTimeout(finishPlayback, PLAYBACK_TIMEOUT_MS);
    } else {
      finishPlayback();
    }
  }, [busy, repeat, bridge, speed, finishPlayback]);

  // Auto battle: keep executing Smart/Repeat turns until stopped or finished.
  useEffect(() => {
    if (!auto || busy || session.result !== 'ONGOING') return;
    const id = setTimeout(() => run(session), 250 / speed);
    return () => clearTimeout(id);
  }, [auto, busy, session, run, speed]);

  const allies = shown.state.combatants.filter((c) => c.side === 'PLAYER');
  const enemies = shown.state.combatants.filter((c) => c.side === 'ENEMY');
  const finished = !busy && session.result !== 'ONGOING';
  const telegraph = !busy ? activeTelegraph(session) : null;

  const describe = (cmd: BattleCommand | undefined): string => {
    if (!cmd) return '대기';
    if (cmd.type === 'DEFEND') return '방어';
    if (cmd.type === 'ATTACK') return `공격 → ${name(cmd.targetId)}`;
    return `${tacticName(cmd.tacticId)}${cmd.targetId ? ` → ${name(cmd.targetId)}` : ''}`;
  };

  const choose = (command: BattleCommand) => {
    setSession((s) => setCommand(s, command));
    setPicking(null);
    setSheetFor(null);
  };

  const onEnemyTap = (enemy: Combatant) => {
    if (!picking || enemy.troops <= 0) return;
    choose(picking.kind === 'ATTACK' ? { type: 'ATTACK', actorId: picking.actorId, targetId: enemy.id } : { type: 'TACTIC', actorId: picking.actorId, tacticId: picking.tacticId, targetId: enemy.id });
  };

  const onAllyTap = (ally: Combatant) => {
    if (picking?.kind === 'TACTIC') {
      const spec = session.rules.tactics[picking.tacticId];
      if (spec?.target === 'SINGLE_ALLY' && ally.troops > 0) {
        choose({ type: 'TACTIC', actorId: picking.actorId, tacticId: picking.tacticId, targetId: ally.id });
        return;
      }
    }
    if (busy || auto || ally.troops <= 0) return;
    setPicking(null);
    setSheetFor(ally.id);
  };

  const sheetActor = sheetFor ? session.state.combatants.find((c) => c.id === sheetFor) : undefined;
  const tp = session.state.tp.PLAYER;
  const plannedTp = useMemo(() => session.plan.reduce((sum, c) => sum + (c.type === 'TACTIC' ? session.rules.tactics[c.tacticId]?.tpCost ?? 0 : 0), 0), [session]);

  return (
    <section className="battle-panel" aria-label="전투 명령" data-turn={shown.state.turn} data-result={finished ? session.result : 'ONGOING'} data-busy={busy} data-formation={session.state.formations.PLAYER?.id ?? ''}>
      <div className="battle-status">
        <span>턴 {shown.state.turn}</span>
        <span aria-label={`책략 포인트 ${tp.current} / ${tp.max}`}>TP {tp.current}/{tp.max}{plannedTp > 0 ? ` (예정 -${plannedTp})` : ''}</span>
        {lastTurn && <span className="sr-only" role="status">{lastTurn.events.length}개 행동 처리</span>}
      </div>

      {telegraph && (
        <div className="telegraph-banner" role="status" aria-live="polite">
          <strong>⚠ 공격 예고</strong>
          <span>{t(telegraph.messageKey)}</span>
        </div>
      )}

      <div className="enemy-row" role="group" aria-label="적 부대">
        {enemies.map((e) => (
          <button
            key={e.id}
            type="button"
            className={`unit-chip enemy${picking ? ' targetable' : ''}${e.troops <= 0 ? ' routed' : ''}`}
            disabled={e.troops <= 0 || !picking}
            onClick={() => onEnemyTap(e)}
            aria-label={`${name(e.id)} 병력 ${e.troops}${e.troops <= 0 ? ' 패주' : ''}${picking ? ' — 목표로 선택' : ''}`}
          >
            <strong>{name(e.id)}</strong>
            <TroopBar unit={e} />
          </button>
        ))}
      </div>

      {picking && <p className="pick-hint" role="status">{picking.kind === 'ATTACK' ? '공격할 적을 터치하세요' : `${tacticName(picking.tacticId)} 대상을 터치하세요`} <button type="button" className="link" onClick={() => setPicking(null)}>취소</button></p>}

      <ul className="ally-list" aria-label="아군 명령">
        {allies.map((a) => {
          const cmd = session.plan.find((c) => c.actorId === a.id);
          return (
            <li key={a.id}>
              <button type="button" className={`ally-row${a.troops <= 0 ? ' routed' : ''}`} onClick={() => onAllyTap(a)} disabled={a.troops <= 0 || ((busy || auto) && picking?.kind !== 'TACTIC')} aria-label={`${name(a.id)} 병력 ${a.troops} / ${a.maxTroops}, 명령 ${describe(cmd)}. 변경하려면 터치`}>
                <span className="ally-name">{name(a.id)}</span>
                <TroopBar unit={a} />
                <span className={`ally-cmd${cmd && cmd.type !== 'ATTACK' ? ' changed' : ''}`}>{a.troops <= 0 ? '패주' : describe(cmd)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="battle-actions">
        <button type="button" className="primary start" onClick={() => run(session)} disabled={busy || auto || session.result !== 'ONGOING'}>전투개시</button>
        <button type="button" onClick={() => { const s = resetPlan(session, 'ALL_ATTACK'); setSession(s); run(s); }} disabled={busy || auto || session.result !== 'ONGOING'}>전원공격</button>
        <button type="button" aria-pressed={repeat} className={repeat ? 'on' : ''} onClick={() => { setRepeat((v) => !v); }}>반복</button>
        <button type="button" aria-pressed={auto} className={auto ? 'on' : ''} onClick={() => setAuto((v) => !v)} disabled={session.result !== 'ONGOING'}>{auto ? '자동 중지' : '자동'}</button>
        <button type="button" onClick={() => setSpeed((s) => ((s % 3) + 1) as PlaybackSpeed)} aria-label={`전투 속도 x${speed}`}>x{speed}</button>
        {session.canRetreat && <button type="button" onClick={() => { const s = retreat(session); setSession(s); setShown(s); setAuto(false); }} disabled={busy || session.result !== 'ONGOING'}>후퇴</button>}
      </div>

      {sheetActor && (
        <div className="bottom-sheet" role="dialog" aria-label={`${name(sheetActor.id)} 명령 선택`}>
          <strong>{name(sheetActor.id)}의 명령</strong>
          <div className="sheet-options">
            <button type="button" onClick={() => { setSheetFor(null); setPicking({ actorId: sheetActor.id, kind: 'ATTACK' }); }}>공격</button>
            <button type="button" onClick={() => choose({ type: 'DEFEND', actorId: sheetActor.id })}>방어</button>
            {sheetActor.tacticIds.map((id) => {
              const spec = session.rules.tactics[id];
              if (!spec) return null;
              const otherTp = plannedTp - (session.plan.find((c) => c.actorId === sheetActor.id && c.type === 'TACTIC') ? session.rules.tactics[(session.plan.find((c) => c.actorId === sheetActor.id) as { tacticId: string }).tacticId]?.tpCost ?? 0 : 0);
              const affordable = spec.tpCost <= tp.current - otherTp;
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!affordable}
                  onClick={() => {
                    if (spec.target === 'SINGLE_ENEMY' || spec.target === 'SINGLE_ALLY') {
                      setSheetFor(null);
                      setPicking({ actorId: sheetActor.id, kind: 'TACTIC', tacticId: id });
                    } else choose({ type: 'TACTIC', actorId: sheetActor.id, tacticId: id });
                  }}
                >
                  {tacticName(id)} <small>TP {spec.tpCost}</small>
                </button>
              );
            })}
          </div>
          <button type="button" className="link" onClick={() => setSheetFor(null)}>닫기</button>
        </div>
      )}

      {finished && (
        <div className="result-sheet" role="dialog" aria-label="전투 결과">
          <strong>{session.result === 'VICTORY' ? '승리!' : session.result === 'DEFEAT' ? '패배…' : session.result === 'RETREAT' ? '후퇴했다' : '무승부'}</strong>
          {session.result === 'VICTORY' && <p>보상: 금 {registry.encounters.get(session.encounterId)?.rewards.gold ?? 0}, 경험치 {registry.encounters.get(session.encounterId)?.rewards.xp ?? 0}</p>}
          <button type="button" className="primary" onClick={() => onFinish(session)}>계속</button>
        </div>
      )}
    </section>
  );
}

function TroopBar({ unit }: { unit: Combatant }) {
  const pct = Math.max(0, Math.round((unit.troops / unit.maxTroops) * 100));
  return (
    <span className="troop" aria-hidden="true">
      <span className="troop-bar"><span style={{ width: `${pct}%` }} /></span>
      <span className="troop-num">{unit.troops.toLocaleString('ko-KR')}</span>
    </span>
  );
}
