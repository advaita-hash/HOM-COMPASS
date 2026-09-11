import type { Repertory } from '../types';
import { EMBED_DIM, embedMany } from './embedder';

// ---------------------------------------------------------------------------
// A semantic index over the repertory's rubrics: each rubric's path text is
// embedded once and stored int8-quantised in IndexedDB, so the second visit is
// instant. To keep the one-time build tractable in the browser we index the
// clinically-common core (paths up to 3 segments: chapter → rubric →
// sub-rubric, ~18k rubrics); the keyword matcher still covers deeper rubrics.
// ---------------------------------------------------------------------------

const INDEX_VERSION = 1;
// Index the main rubrics (chapter → rubric, ≤2 path segments, ~3.8k). This
// keeps the one-time in-browser build to ~a minute on single-threaded WASM
// while covering every chapter's principal rubrics; the keyword matcher still
// resolves deeper sub-rubrics once the right main rubric is on the worksheet.
const MAX_DEPTH = 2;
const DB_NAME = 'hom-compass.semantic';
const STORE = 'indexes';

export interface RubricIndex {
  repId: string;
  ids: string[];
  dim: number;
  /** ids.length * dim, int8 (unit vectors * 127). */
  data: Int8Array;
}

export interface SemHit {
  id: string;
  score: number; // cosine similarity, ~[-1, 1]
}

// ---- IndexedDB (tiny promise wrapper, no dependency) ----------------------
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
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

const keyFor = (rep: Repertory, n: number) => `${rep.id}:v${INDEX_VERSION}:${n}`;

/** Rubrics that go into the semantic index (bounded core). */
function coreRubrics(rep: Repertory) {
  return rep.rubrics.filter((r) => r.rubric.split(',').length <= MAX_DEPTH);
}

/** Load a cached index for this repertory, or null if not built yet. */
export async function loadIndex(rep: Repertory): Promise<RubricIndex | null> {
  try {
    const n = coreRubrics(rep).length;
    const stored = await idbGet<{ ids: string[]; dim: number; data: ArrayBuffer }>(keyFor(rep, n));
    if (!stored || stored.ids.length !== n) return null;
    return { repId: rep.id, ids: stored.ids, dim: stored.dim, data: new Int8Array(stored.data) };
  } catch {
    return null;
  }
}

/**
 * Build (and cache) the semantic index in the browser, embedding rubric texts
 * in batches so the UI can show progress and stay responsive.
 */
export async function buildIndex(
  rep: Repertory,
  opts: { onProgress?: (done: number, total: number) => void; signal?: AbortSignal; batch?: number } = {},
): Promise<RubricIndex> {
  const rubrics = coreRubrics(rep);
  const total = rubrics.length;
  const batch = opts.batch ?? 64;
  const ids: string[] = new Array(total);
  const data = new Int8Array(total * EMBED_DIM);

  for (let i = 0; i < total; i += batch) {
    if (opts.signal?.aborted) throw new DOMException('aborted', 'AbortError');
    const slice = rubrics.slice(i, i + batch);
    const rows = await embedMany(slice.map((r) => r.rubric));
    for (let j = 0; j < slice.length; j++) {
      ids[i + j] = slice[j].id;
      const v = rows[j];
      const off = (i + j) * EMBED_DIM;
      for (let d = 0; d < EMBED_DIM; d++) {
        data[off + d] = Math.max(-127, Math.min(127, Math.round(v[d] * 127)));
      }
    }
    opts.onProgress?.(Math.min(i + batch, total), total);
    // yield to the event loop so the page stays responsive
    await new Promise((r) => setTimeout(r, 0));
  }

  const index: RubricIndex = { repId: rep.id, ids, dim: EMBED_DIM, data };
  try {
    await idbSet(keyFor(rep, total), { ids, dim: EMBED_DIM, data: data.buffer });
  } catch {
    /* storage full / unavailable — keep the in-memory index anyway */
  }
  return index;
}

/** Top-k rubric ids by cosine similarity to a (unit) query vector. */
export function searchIndex(index: RubricIndex, query: Float32Array, k = 8): SemHit[] {
  const { ids, dim, data } = index;
  const hits: SemHit[] = [];
  for (let i = 0; i < ids.length; i++) {
    const off = i * dim;
    let dot = 0;
    for (let d = 0; d < dim; d++) dot += query[d] * data[off + d];
    hits.push({ id: ids[i], score: dot / 127 });
  }
  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, k);
}
