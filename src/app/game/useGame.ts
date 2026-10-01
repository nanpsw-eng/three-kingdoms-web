import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { loadBundledContent } from '../../game/content/bundled';
import type { ContentRegistry } from '../../game/content/registry';
import type { SaveGame } from '../../game/domain/save/index';
import { DexieSaveRepository } from '../../game/persistence/dexieRepository';
import { MemorySaveRepository } from '../../game/persistence/memoryRepository';
import type { SaveRepository } from '../../game/persistence/repository';
import { createNewGame } from '../../game/save/newGame';

let registryCache: ContentRegistry | null = null;
export function getRegistry(): ContentRegistry {
  return (registryCache ??= loadBundledContent());
}

export type SaveStatus = 'loading' | 'ready' | 'saving' | 'error';

export interface GameApi {
  registry: ContentRegistry;
  save: SaveGame | null;
  status: SaveStatus;
  error: string | null;
  /** Apply a pure update and autosave at this stable boundary. */
  commit(update: (save: SaveGame) => SaveGame): void;
  t(key: string): string;
}

function openRepository(): SaveRepository {
  try {
    if (typeof indexedDB !== 'undefined') return new DexieSaveRepository();
  } catch {
    // fall through to memory
  }
  return new MemorySaveRepository();
}

const SLOT = 'auto';

export function useGame(): GameApi {
  const registry = useMemo(getRegistry, []);
  const repo = useRef<SaveRepository | null>(null);
  const [save, setSave] = useState<SaveGame | null>(null);
  const [status, setStatus] = useState<SaveStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const slot = useRef(SLOT);

  useEffect(() => {
    let cancelled = false;
    const r = (repo.current ??= openRepository());
    (async () => {
      let loaded: SaveGame | null = null;
      try {
        loaded = await r.load(SLOT);
      } catch (e) {
        // Never overwrite an unreadable save: continue in a separate recovery slot.
        setError(`저장 데이터를 읽을 수 없어 새 슬롯으로 시작합니다: ${String(e)}`);
        slot.current = 'recovery';
      }
      const next = loaded ?? createNewGame(registry, new Date().toISOString(), slot.current);
      if (!loaded) await r.save(next).catch((e: unknown) => setError(String(e)));
      if (!cancelled) {
        setSave(next);
        setStatus('ready');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [registry]);

  const commit = useCallback((update: (s: SaveGame) => SaveGame) => {
    setSave((current) => {
      if (!current) return current;
      const next = { ...update(current), updatedAt: new Date().toISOString() };
      setStatus('saving');
      repo.current
        ?.save(next)
        .then(() => setStatus('ready'))
        .catch((e: unknown) => {
          setStatus('error');
          setError(String(e));
        });
      return next;
    });
  }, []);

  const t = useCallback((key: string) => registry.locales.ko?.[key] ?? key, [registry]);

  return { registry, save, status, error, commit, t };
}
