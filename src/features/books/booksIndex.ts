import { useQuery } from '@tanstack/react-query';
import type { BookData, BookMeta, BookRemedy } from './types';

// Cross-source spelling aliases (per word) so the same remedy matches across
// Kent's Repertory, Boericke, Tyler and Allen. Non-destructive — the source
// data keeps its own names; this only normalises names at lookup time.
const WORD_ALIAS: Record<string, string> = {
  kalium: 'kali', // Kent uses Kalium/Natrium; Boericke & Tyler use Kali/Natrum
  natrium: 'natrum',
  cinchona: 'china', // China = Cinchona
  platinum: 'platina',
  bromum: 'bromium',
  mellifera: 'mellifica',
  staphysagria: 'staphisagria',
  hispanica: 'hispania',
  sativus: 'sativa',
  hippozaeninum: 'hippozaenium',
  acidum: 'acid', // Tyler anglicises some acids
  magnesium: 'magnesia', // Boericke: Magnesia carbonica
  actea: 'actaea',
  glonoine: 'glonoinum',
  virginica: 'virginiana',
  amylenum: 'amyl',
  thyroidinum: 'thyreoidinum',
  iodum: 'iodium',
  // Tyler's English / short names
  silica: 'silicea',
  colocynth: 'colocynthis',
  pyrogen: 'pyrogenium',
  poeonia: 'paeonia', // Tyler "Pœonia"
};

// Whole-name synonyms: the same medicine under a different binomial. Matched
// at the start of the name, so "Lac vaccinum defloratum" finds Allen's
// "Lac defloratum" rather than his "Lac vaccinum".
const PHRASE_ALIAS: Record<string, string> = {
  'calcarea ostrearum': 'calcarea carbonica',
  'pulsatilla nigricans': 'pulsatilla pratensis',
  'actaea racemosa': 'cimicifuga racemosa',
  'lachesis mutus': 'lachesis muta',
  'asarum europaeum': 'asarum officinale',
  'mercurius biniodatus': 'mercurius iodatus ruber',
  'mercurius proto iodatus': 'mercurius iodatus flavus',
  'lac vaccinum defloratum': 'lac defloratum',
  'malaria officinalis': 'malaria nosode',
  'hepar sulphuris calcareum': 'hepar sulphur',
  // after the longer form above: the first matching phrase wins
  'hepar sulphuris': 'hepar sulphur', // Tyler
  'terebinthiniae oleum': 'terebinthina',
  'rhus tox': 'rhus toxicodendron', // Tyler "Rhus tox."
  'phosphorus acid': 'phosphoricum acidum', // Tyler
};

/** Latin case endings vary by source (carbonicum / carbonica, Adrenalin / -inum). */
function stem(w: string): string {
  for (const e of ['um', 'us', 'a']) {
    if (w.endsWith(e) && w.length - e.length >= 4) return w.slice(0, -e.length);
  }
  return w;
}

function baseWords(s: string): string[] {
  return s
    .toLowerCase()
    // ligatures don't decompose under NFKD (Tyler's "Asafœtida", "Pœonia")
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => stem(WORD_ALIAS[w] ?? w));
}

const PHRASES = Object.entries(PHRASE_ALIAS).map(
  ([from, to]) => [baseWords(from).join(' '), baseWords(to).join(' ')] as const,
);

function canonWords(s: string): string[] {
  let joined = baseWords(s).join(' ');
  for (const [from, to] of PHRASES) {
    if (joined === from || joined.startsWith(`${from} `)) {
      joined = to + joined.slice(from.length);
      break;
    }
  }
  return joined.split(' ').filter(Boolean);
}

/**
 * A remedy name in the form findBookRemedy compares (aliases, spelling and
 * case endings normalised), so two names are the same medicine's name when
 * their keys are equal: "Pulsatilla Nigricans" / "Pulsatilla Pratensis".
 */
export function bookNameKey(name: string): string {
  return canonWords(name).join(' ');
}

const nameIndexCache = new WeakMap<BookData, Map<string, BookRemedy>>();

/**
 * Find a remedy in a book from a (possibly longer / differently-spelled)
 * repertory name — e.g. "Borax Veneta" → Borax, "Mercurius Solubilis" →
 * Mercurius, "Kalium Bichromicum" → Kali Bichromicum, "Platinum Metallicum" →
 * Platina. Applies cross-source aliases, then matches the longest exact
 * word-prefix, so it never matches the wrong remedy.
 */
export function findBookRemedy(book: BookData, name: string): BookRemedy | undefined {
  let idx = nameIndexCache.get(book);
  if (!idx) {
    idx = new Map();
    for (const r of book.remedies) {
      const key = canonWords(r.name).join('');
      if (!idx.has(key)) idx.set(key, r);
    }
    nameIndexCache.set(book, idx);
  }
  const words = canonWords(name);
  for (let k = words.length; k >= 1; k--) {
    const hit = idx.get(words.slice(0, k).join(''));
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Bundled reference books. The heavy full-text payloads live as static JSON in
 * `public/books/{id}.json` and are fetched on demand; only this light catalogue
 * is bundled into the app.
 */
export const BOOKS: BookMeta[] = [
  {
    id: 'boericke',
    title: 'Pocket Manual of Homœopathic Materia Medica',
    author: 'William Boericke',
    label: 'Boericke',
    shortTitle: 'Materia Medica',
    blurb:
      'The classic bedside repertory-materia medica — concise, system-by-system remedy pictures with modalities and relationships.',
    cover: 'from-art-teal to-art-emerald',
    approxRemedies: 632,
  },
  {
    id: 'tyler',
    title: 'Homœopathic Drug Pictures',
    author: 'Margaret L. Tyler',
    label: 'Tyler',
    shortTitle: 'Drug Pictures',
    blurb:
      'Vivid, narrative remedy portraits that bring the constitutional picture of each medicine to life for the practitioner.',
    cover: 'from-art-indigo to-art-violet',
    approxRemedies: 120,
  },
  {
    id: 'allen',
    title: "Allen's Keynotes — Rearranged and Classified",
    author: 'H. C. Allen',
    label: 'Allen',
    shortTitle: 'Keynotes',
    blurb:
      'Characteristic keynotes of the leading remedies, sorted into constitution, mental and physical generals, systems and modalities — plus the bowel nosodes.',
    cover: 'from-art-amber to-art-rose',
    approxRemedies: 210,
  },
];

export function getBookMeta(id: string | undefined): BookMeta | undefined {
  return BOOKS.find((b) => b.id === id);
}

/**
 * Site footer scraped along with the Médi-T Boericke transcription ("Home" is a
 * nav link). The JSON keeps it — the ingestion checks use it as an end marker —
 * so it is stripped here, once, for the reader, drug picture and search alike.
 */
const SCRAPED_FOOTER_RE = /\s*Copyright\s*©\s*Médi-T\s*1999\s*Home\s*$/;

async function fetchBook(id: string): Promise<BookData> {
  const res = await fetch(`${import.meta.env.BASE_URL}books/${id}.json`);
  if (!res.ok) {
    throw new Error(`Could not load "${id}" (${res.status})`);
  }
  const data: BookData = await res.json();
  return {
    ...data,
    remedies: data.remedies.map((r) => ({ ...r, text: r.text.replace(SCRAPED_FOOTER_RE, '') })),
  };
}

/** Shared query options, so useBook and useQueries hit the same cache entry. */
export function bookQueryOptions(id: string) {
  return {
    queryKey: ['book', id] as const,
    queryFn: () => fetchBook(id),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  };
}

/** Load a book's full text payload (cached by TanStack Query). */
export function useBook(id: string | undefined) {
  return useQuery({ ...bookQueryOptions(id as string), enabled: Boolean(id) });
}
