import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Repertory } from '../types';
import { embedMany, embeddingsSupported } from './embedder';
import { buildLexicon, lexiconSet, loadLexicon, nearest, type VectorIndex } from './lexicon';
import { useSemanticEnabled } from './semanticStore';

export type SemStatus = 'off' | 'unsupported' | 'loading' | 'building' | 'ready' | 'error';

/** A common word and the repertory word(s) it was translated to. */
export interface WordTranslation {
  word: string;
  to: string[];
}

const SIM_THRESHOLD = 0.52; // strict: a lay word must be clearly close to a repertory word
const TOP_PER_WORD = 2;

export interface Semantic {
  status: SemStatus;
  progress: { done: number; total: number } | null;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  /** Translate common words → repertory words (empty unless ready). */
  translate: (words: string[]) => Promise<WordTranslation[]>;
}

/**
 * Manages the on-device repertory-lexicon so common words can be translated to
 * repertory words. Loads the model, builds/loads the lexicon embedding index,
 * and exposes `translate`. Any failure degrades to status 'error' and the
 * caller falls back to keyword matching, so the app never breaks.
 */
export function useSemantic(rep: Repertory | undefined): Semantic {
  const enabled = useSemanticEnabled((s) => s.enabled);
  const setEnabled = useSemanticEnabled((s) => s.setEnabled);
  const [status, setStatus] = useState<SemStatus>('off');
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const indexRef = useRef<VectorIndex | null>(null);

  const skip = useMemo(() => (rep ? lexiconSet(rep) : new Set<string>()), [rep]);

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
        if (indexRef.current?.key.startsWith(`${rep.id}:`)) {
          setStatus('ready');
          return;
        }
        setStatus('loading');
        const cached = await loadLexicon(rep);
        if (cancelled) return;
        if (cached) {
          indexRef.current = cached;
          setStatus('ready');
          return;
        }
        setStatus('building');
        setProgress({ done: 0, total: 1 });
        const built = await buildLexicon(rep, {
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

  const translate = useCallback(
    async (words: string[]): Promise<WordTranslation[]> => {
      const index = indexRef.current;
      if (status !== 'ready' || !index) return [];
      // only translate words that aren't already repertory words
      const need = [...new Set(words.map((w) => w.toLowerCase()))].filter(
        (w) => w.length >= 3 && !skip.has(w),
      );
      if (need.length === 0) return [];
      try {
        const vecs = await embedMany(need);
        const out: WordTranslation[] = [];
        for (let i = 0; i < need.length; i++) {
          const hits = nearest(index, vecs[i], TOP_PER_WORD + 1)
            .filter((h) => h.score >= SIM_THRESHOLD && h.id !== need[i])
            .slice(0, TOP_PER_WORD);
          if (hits.length) out.push({ word: need[i], to: hits.map((h) => h.id) });
        }
        return out;
      } catch {
        return [];
      }
    },
    [status, skip],
  );

  return { status, progress, enabled, setEnabled, translate };
}
