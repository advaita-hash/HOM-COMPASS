// ---------------------------------------------------------------------------
// On-device sentence embeddings via transformers.js (runs in the browser).
//
// This is what lets the app UNDERSTAND everyday language: "tummy ache",
// "gut pain" and "stomach hurts" all land near the "Abdomen / Stomach, pain"
// rubrics by meaning, with no hand-coded synonyms. The model (all-MiniLM-L6-v2,
// ~23 MB quantised) is fetched from the CDN on first use and cached by the
// browser. Everything is dynamically imported so it never touches the main
// bundle, and every failure path degrades to keyword matching.
// ---------------------------------------------------------------------------

export const EMBED_MODEL = 'Xenova/all-MiniLM-L6-v2';
export const EMBED_DIM = 384;

type Extractor = (
  texts: string | string[],
  opts: { pooling: 'mean'; normalize: boolean },
) => Promise<{ data: Float32Array; dims: number[] }>;

let extractor: Extractor | null = null;
let loading: Promise<Extractor> | null = null;

/** Whether the runtime can plausibly run the model (WebAssembly present). */
export function embeddingsSupported(): boolean {
  return typeof WebAssembly === 'object' && typeof indexedDB !== 'undefined';
}

/** Lazily load the model pipeline once (shared across the app). */
export async function getExtractor(): Promise<Extractor> {
  if (extractor) return extractor;
  if (!loading) {
    loading = (async () => {
      const t: any = await import('@xenova/transformers');
      // Hosted model + CDN wasm; never look for local files.
      t.env.allowLocalModels = false;
      t.env.useBrowserCache = true;
      const pipe = await t.pipeline('feature-extraction', EMBED_MODEL, { quantized: true });
      extractor = pipe as Extractor;
      return extractor;
    })().catch((e) => {
      loading = null; // allow a later retry
      throw e;
    });
  }
  return loading;
}

/** Embed one string → unit-normalised Float32Array. */
export async function embedOne(text: string): Promise<Float32Array> {
  const pipe = await getExtractor();
  const out = await pipe(text, { pooling: 'mean', normalize: true });
  return Float32Array.from(out.data);
}

/** Embed many strings → one unit-normalised row per input. */
export async function embedMany(texts: string[]): Promise<Float32Array[]> {
  const pipe = await getExtractor();
  const out = await pipe(texts, { pooling: 'mean', normalize: true });
  const dim = out.dims[out.dims.length - 1];
  const rows: Float32Array[] = [];
  for (let i = 0; i < texts.length; i++) {
    rows.push(Float32Array.from(out.data.subarray(i * dim, (i + 1) * dim)));
  }
  return rows;
}
