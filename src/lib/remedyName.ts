// ---------------------------------------------------------------------------
// Canonical remedy display names.
//
// The three sources spell the same medicine differently — the repertory
// (OOREP) uses "Kalium Carbonicum" / "Natrium Muriaticum" / "Platinum
// Metallicum", Boericke uses "Kali …" / "Natrum …" / "Platina", and Tyler
// lower-cases the species ("Nux vomica"). This makes one remedy read three
// ways across the app.
//
// `canonicalName` produces a single, consistent DISPLAY spelling. It is purely
// cosmetic: the underlying data keeps its own names, and lookups / routing /
// cross-source matching still use the raw names, so nothing downstream breaks.
// ---------------------------------------------------------------------------

/** Per-word spelling → the classic homeopathic form practitioners recognise. */
const WORD_CANON: Record<string, string> = {
  kalium: 'Kali', // Kent/OOREP "Kalium X" → "Kali X"
  natrium: 'Natrum', // "Natrium X" → "Natrum X"
  cinchona: 'China', // Cinchona = China
  platinum: 'Platina',
  // less common but same idea
  bromum: 'Bromium',
  mellifera: 'Mellifica',
  staphysagria: 'Staphisagria',
  hispanica: 'Hispania',
  hippozaeninum: 'Hippozaenium',
};

/** Whole-name overrides for medicines whose classic name isn't a per-word
 *  transform (keyed by the lower-cased, post-word-canon string). */
const FULL_CANON: Record<string, string> = {
  'platina metallicum': 'Platina',
  'platina muriaticum': 'Platina Muriaticum',
};

function titleCase(word: string): string {
  if (!word) return word;
  // Latin binomials: capitalise the first letter, lower-case the rest
  // (fixes Tyler's "vomica" / "phosphoricum"). Leaves non-letters alone.
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

/** Canonical display spelling for a remedy name from any source. */
export function canonicalName(name: string): string {
  if (!name) return name;
  const canon = name
    .trim()
    .split(/\s+/)
    .map((w) => {
      const lw = w.toLowerCase();
      return WORD_CANON[lw] ?? titleCase(w);
    })
    .join(' ');
  return FULL_CANON[canon.toLowerCase()] ?? canon;
}
