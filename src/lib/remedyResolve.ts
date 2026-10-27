import ABBREV from '../data/remedyAbbrev.json';

// ---------------------------------------------------------------------------
// Repertory remedy lookup from whatever a person (or a book) calls it.
//
// The key is the repertory (Kent / OOREP) remedy name. It can be reached by
// its full name ("Nux Vomica"), its Kentian abbreviation ("Nux-v."), an
// alternative name, a classic spelling ("Kali Bichromicum" for "Kalium
// Bichromicum"), or an everyday short name ("Pulsatilla", "Nat mur").
//
// Shared by the remedy profile (/remedy/:name) and the notepad's remedy keys,
// so a remedy has one identity across the app.
// ---------------------------------------------------------------------------

/** Repertory name → [Kentian abbreviation, alternative names?]. */
export const REMEDY_TABLE = ABBREV as unknown as Record<string, [string] | [string, string[]]>;

const SAME: Record<string, string> = { kali: 'kalium', natrum: 'natrium', platina: 'platinum', china: 'cinchona' };
const key = (s: string) =>
  s
    .toLowerCase()
    // ligatures don't decompose under NFKD ("Asafœtida", "Pæonia")
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .map((w) => SAME[w] ?? w)
    .join(' ');

/** Lookup by full name, abbreviation (with or without its dots) or alternative name. */
const INDEX = (() => {
  const m = new Map<string, string>();
  for (const [name, [abbr, alts = []]] of Object.entries(REMEDY_TABLE)) {
    for (const k of [abbr, name, ...alts]) if (!m.has(key(k))) m.set(key(k), name);
  }
  return m;
})();

/** Everyday short names whose prefix match would otherwise be a toss-up. */
const COMMON: Record<string, string> = {
  nux: 'Nux Vomica',
  merc: 'Mercurius Solubilis',
  mercurius: 'Mercurius Solubilis',
};

/** Every spelling of each remedy as word lists, for word-prefix matching. */
const SPELLINGS = Object.entries(REMEDY_TABLE).flatMap(([name, [abbr, alts = []]]) =>
  [name, ...alts].map((s) => ({ name, abbr, words: key(s).split(' ') })),
);

/**
 * Common names: "Pulsatilla", "Arsenicum", "Nat mur", "Calc carb", "Rhus tox".
 * Each typed word must start the matching word of a full name, in order. When
 * several remedies fit, the classic polychrest wins — the one with the plain
 * Kentian abbreviation ("Puls." over "Puls-n.", "Ars." over "Ars-i.").
 */
function resolveCommon(k: string): RemedyMatch | undefined {
  if (COMMON[k] && REMEDY_TABLE[COMMON[k]]) return { name: COMMON[k], how: 'common' };
  const typed = k.split(' ').filter(Boolean);
  if (!typed.length) return undefined;
  const hits = SPELLINGS.filter(
    (s) => s.words.length >= typed.length && typed.every((w, i) => s.words[i].startsWith(w)),
  );
  if (!hits.length) return undefined;
  hits.sort(
    (a, b) =>
      Number(a.abbr.includes('-')) - Number(b.abbr.includes('-')) ||
      a.words.length - b.words.length ||
      a.abbr.length - b.abbr.length ||
      a.name.localeCompare(b.name),
  );
  return { name: hits[0].name, how: 'prefix' };
}

export interface RemedyMatch {
  /** Repertory name. */
  name: string;
  /**
   * exact: a full name, abbreviation or alternative name; common: one of the
   * everyday short names above; prefix: the best word-prefix guess.
   */
  how: 'exact' | 'common' | 'prefix';
}

/** resolveRemedy, also saying how sure the match is. */
export function resolveRemedyMatch(param: string): RemedyMatch | undefined {
  const k = key(param);
  const exact = INDEX.get(k) ?? INDEX.get(key(param.replace(/\./g, '')));
  if (exact) return { name: exact, how: 'exact' };
  return resolveCommon(k) ?? resolveCommon(key(param.replace(/\./g, '')));
}

/** The repertory remedy a name, abbreviation or common name refers to, if any. */
export function resolveRemedy(param: string): string | undefined {
  return resolveRemedyMatch(param)?.name;
}
