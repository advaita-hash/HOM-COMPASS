import { useCallback, useEffect, useRef, useState } from 'react';
import type { Repertory } from '../types';
import { embedOne, embeddingsSupported } from './embedder';
import { buildIndex, loadIndex, searchIndex, type RubricIndex, type SemHit } from './rubricIndex';
import { useSemanticEnabled } from './semanticStore';

export type SemStatus =
  | 'off'
  | 'unsupported'
  | 'loading' // fetching model
  | 'building' // embedding rubrics
  | 'ready'
  | 'error';

export interface Semantic {
  status: SemStatus;
  progress: { done: number; total: number } | null;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  /** Semantic matches for a phrase (empty unless status === 'ready'). */
  search: (phrase: string, k?: number) => Promise<SemHit[]>;
}

/**
 * Manages the on-device semantic layer for the active repertory: loads the
 * model, builds/loads the rubric index, and exposes a phrase search. All
 * failures degrade to status 'error' (the caller then falls back to keyword
 * matching), so the app never breaks if the model can't load.
 */
export function useSemantic(rep: Repertory | undefined): Semantic {
  const enabled = useSemanticEnabled((s) => s.enabled);
  const setEnabled = useSemanticEnabled((s) => s.setEnabled);
  const [status, setStatus] = useState<SemStatus>('off');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const indexRef = useRef<RubricIndex | null>(null);

  useEffect(() => {
    if (!enabled) {
      setStatus('off');
      return;
    }
    if (!embeddingsSupported()) {
      setStatus('unsupported');
      return;
    }
    let cancelled = false;
    const ac = new AbortController();
    (async () => {
      try {
        if (!rep) return;
        // reuse an index already in memory for this repertory
        if (indexRef.current?.repId === rep.id) {
          setStatus('ready');
          return;
        }
        setStatus('loading');
        const cached = await loadIndex(rep);
        if (cancelled) return;
        if (cached) {
          indexRef.current = cached;
          setStatus('ready');
          return;
        }
        setStatus('building');
        setProgress({ done: 0, total: 1 });
        const built = await buildIndex(rep, {
          signal: ac.signal,
          onProgress: (done, total) => !cancelled && setProgress({ done, total }),
        });
        if (cancelled) return;
        indexRef.current = built;
        setStatus('ready');
      } catch (e) {
        if (!cancelled && (e as Error)?.name !== 'AbortError') setStatus('error');
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [enabled, rep]);

  const search = useCallback(
    async (phrase: string, k = 8): Promise<SemHit[]> => {
      const index = indexRef.current;
      if (status !== 'ready' || !index || !phrase.trim()) return [];
      try {
        const q = await embedOne(phrase);
        return searchIndex(index, q, k);
      } catch {
        return [];
      }
    },
    [status],
  );

  return { status, progress, enabled, setEnabled, search };
}
