import type { Repertory } from '../types';
import { EMBED_DIM, embedMany } from './embedder';

// ---------------------------------------------------------------------------
// A "repertory lexicon" embedding index: every significant word that actually
// occurs in the repertory's rubric paths is embedded once. Because the app
// understands English (the embedding model), we can then translate any common
// word the clinician types to its nearest *repertory* word — "tummy" → abdomen,
// "throw up" → vomiting, "pee" → urine — with no hand-coded synonyms. The
// translated words are fed to the keyword matcher, which already covers every
// rubric, so understanding spans the whole repertory, not just a subset.
//
// The lexicon (~a few thousand words) is embedded in the browser once and cached
// in IndexedDB, so it is instant on later visits.
// ---------------------------------------------------------------------------

const VERSION = 1;
const MIN_LEN = 3;
const MIN_FREQ = 3; // ignore one-off OCR-ish tokens
const CAP = 3000; // most frequent repertory words
const DB_NAME = 'hom-compass.semantic';
const STORE = 'lexicon';

// Words that are never useful translation targets (articles, connectors). We
// deliberately KEEP repertory terms like "agg"/"amel"/"desires" — those are
// exactly the repertory words we want common words to map onto.
const STOP = new Set(
  `the and for with from into onto out off not are was were has had have will
   this that these those than then when while your their his her its our are
   which who whom whose what how why but yet per via`.split(/\s+/),
);

export interface VectorIndex {
  key: string;
  ids: string[]; // the repertory words
  dim: number;
  data: Int8Array; // ids.length * dim, unit vectors * 127
}

export interface Hit {
  id: string;
  score: number;
}

// ---- IndexedDB (tiny wrapper) ---------------------------------------------
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => reject(r.error);
  });
}
async function idbSet(key: string, val: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** The repertory's own vocabulary — significant words from all rubric paths. */
export function lexiconWords(rep: Repertory): string[] {
  const freq = new Map<string, number>();
  for (const r of rep.rubrics) {
    for (const w of r.rubric.toLowerCase().split(/[^a-z]+/)) {
      if (w.length >= MIN_LEN && !STOP.has(w)) freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .filter(([, c]) => c >= MIN_FREQ)
    .sort((a, b) => b[1] - a[1])
    .slice(0, CAP)
    .map(([w]) => w);
}

const keyFor = (rep: Repertory, n: number) => `${rep.id}:v${VERSION}:${n}`;

export async function loadLexicon(rep: Repertory): Promise<VectorIndex | null> {
  try {
    const n = lexiconWords(rep).length;
    const s = await idbGet<{ ids: string[]; dim: number; data: ArrayBuffer }>(keyFor(rep, n));
    if (!s || s.ids.length !== n) return null;
    return { key: keyFor(rep, n), ids: s.ids, dim: s.dim, data: new Int8Array(s.data) };
  } catch {
    return null;
  }
}

export async function buildLexicon(
  rep: Repertory,
  opts: { onProgress?: (done: number, total: number) => void; signal?: AbortSignal; batch?: number } = {},
): Promise<VectorIndex> {
  const words = lexiconWords(rep);
  const total = words.length;
  const batch = opts.batch ?? 64;
  const data = new Int8Array(total * EMBED_DIM);

  for (let i = 0; i < total; i += batch) {
    if (opts.signal?.aborted) throw new DOMException('aborted', 'AbortError');
    const slice = words.slice(i, i + batch);
    const rows = await embedMany(slice);
    for (let j = 0; j < slice.length; j++) {
      const off = (i + j) * EMBED_DIM;
      const v = rows[j];
      for (let d = 0; d < EMBED_DIM; d++) {
        data[off + d] = Math.max(-127, Math.min(127, Math.round(v[d] * 127)));
      }
    }
    opts.onProgress?.(Math.min(i + batch, total), total);
    await new Promise((r) => setTimeout(r, 0));
  }

  const index: VectorIndex = { key: keyFor(rep, total), ids: words, dim: EMBED_DIM, data };
  try {
    await idbSet(keyFor(rep, total), { ids: words, dim: EMBED_DIM, data: data.buffer });
  } catch {
    /* storage unavailable — keep in-memory index */
  }
  return index;
}

/** Top-k nearest repertory words to a unit query vector. */
export function nearest(index: VectorIndex, query: Float32Array, k = 3): Hit[] {
  const { ids, dim, data } = index;
  const hits: Hit[] = [];
  for (let i = 0; i < ids.length; i++) {
    const off = i * dim;
    let dot = 0;
    for (let d = 0; d < dim; d++) dot += query[d] * data[off + d];
    hits.push({ id: ids[i], score: dot / 127 });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, k);
}

/** Set of repertory words (to skip translating words that are already repertory). */
export function lexiconSet(rep: Repertory): Set<string> {
  return new Set(lexiconWords(rep));
}
