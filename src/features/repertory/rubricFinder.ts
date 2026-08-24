import type { Repertory, Rubric } from './types';

// ---------------------------------------------------------------------------
// Everyday language → repertory language.
// Maps a clinician's plain-language symptom to candidate repertory rubrics by
// translating colloquial terms into repertory vocabulary and scoring rubric
// paths by token overlap. Runs entirely client-side (demo mode); when a backend
// is configured this is where an embedding/LLM call would slot in.
// ---------------------------------------------------------------------------

/** Colloquial term → repertory term(s). */
const SYNONYMS: Record<string, string[]> = {
  // modalities (repertory uses the abbreviations "agg." / "amel.")
  worse: ['agg'], aggravated: ['agg'], aggravates: ['agg'], aggravation: ['agg'],
  better: ['amel'], relieved: ['amel'], relief: ['amel'], eased: ['amel'],
  amelioration: ['amel'],
  // desires / aversions
  craves: ['desires'], craving: ['desires'], crave: ['desires'], wants: ['desires'],
  loves: ['desires'], likes: ['desires'],
  hates: ['aversion'], dislikes: ['aversion'], averse: ['aversion'],
  // mind
  anxious: ['anxiety'], worried: ['anxiety'], worry: ['anxiety'], nervous: ['anxiety'],
  scared: ['fear'], afraid: ['fear'], frightened: ['fear'], phobia: ['fear'],
  sad: ['sadness'], depressed: ['sadness'], unhappy: ['sadness'], grief: ['grief', 'sadness'],
  grieving: ['grief'], angry: ['anger', 'irritability'], irritable: ['irritability'],
  irritated: ['irritability'], weepy: ['weeping'], crying: ['weeping'], tearful: ['weeping'],
  restless: ['restlessness'], fidgety: ['restlessness'], forgetful: ['memory', 'forgetful'],
  confused: ['confusion'], indifferent: ['indifference'], jealous: ['jealousy'],
  suspicious: ['suspicious'], sympathy: ['consolation'], consoled: ['consolation'],
  // sleep
  insomnia: ['sleeplessness'], sleepless: ['sleeplessness'], drowsy: ['sleepiness'],
  sleepy: ['sleepiness'], nightmares: ['dreams'], dreams: ['dreams'],
  // sensations / temperature
  warm: ['warmth', 'heat'], hot: ['heat'], heat: ['heat'], warmth: ['warmth'],
  cold: ['cold'], chilly: ['cold', 'chilliness'], freezing: ['cold'],
  burning: ['burning'], throbbing: ['pulsating'], cramping: ['cramp'],
  // appetite / stomach
  thirst: ['thirst'], thirsty: ['thirst'], thirstless: ['thirstless'],
  hungry: ['appetite'], appetite: ['appetite'], salt: ['salt'], salty: ['salt'],
  sweets: ['sweets'], sugar: ['sweets'], nausea: ['nausea'], nauseous: ['nausea'],
  vomiting: ['vomiting'], bloated: ['distension'], bloating: ['distension'],
  gas: ['flatulence'], flatulence: ['flatulence'], indigestion: ['indigestion'],
  // general
  tired: ['weakness', 'weariness'], exhausted: ['weakness', 'prostration'],
  fatigue: ['weakness'], weak: ['weakness'], faint: ['fainting'], dizzy: ['vertigo'],
  dizziness: ['vertigo'], sweating: ['perspiration'], sweat: ['perspiration'],
  itching: ['itching'], itchy: ['itching'], headache: ['head', 'pain'],
  cough: ['cough'], coughing: ['cough'], palpitations: ['palpitation'],
  // times
  morning: ['morning'], evening: ['evening'], night: ['night'], midnight: ['midnight'],
  afternoon: ['afternoon'], noon: ['noon'],
};

const STOPWORDS = new Set(
  `the a an of to in on and or is am are be been being have has had i me my he she
   it they we you feel feeling feels felt very really quite when with while at for
   from that this so but as if get gets got getting his her their our your also more
   much some any all each every no not only just about into out up down over under
   after before during then than there here which who whom whose what how why can
   could would should will shall may might must does do did done`
    .split(/\s+/)
    .filter(Boolean),
);

export interface RubricMatch {
  rubric: Rubric;
  score: number;
}

export interface PhraseResult {
  phrase: string;
  matches: RubricMatch[];
}

// cache lowercased rubric paths per repertory object
const cache = new WeakMap<Repertory, { rubric: Rubric; low: string }[]>();
function indexOf(rep: Repertory) {
  let idx = cache.get(rep);
  if (!idx) {
    idx = rep.rubrics.map((r) => ({ rubric: r, low: r.rubric.toLowerCase() }));
    cache.set(rep, idx);
  }
  return idx;
}

function expandTokens(phrase: string): string[] {
  const words = phrase
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOPWORDS.has(w));
  const out = new Set<string>();
  for (const w of words) {
    out.add(w);
    for (const s of SYNONYMS[w] ?? []) out.add(s);
  }
  return [...out];
}

/** Find candidate rubrics for one plain-language phrase. */
export function findRubricsForPhrase(
  rep: Repertory,
  phrase: string,
  limit = 8,
): RubricMatch[] {
  const tokens = expandTokens(phrase);
  if (tokens.length === 0) return [];
  const idx = indexOf(rep);
  const scored: RubricMatch[] = [];
  for (const { rubric, low } of idx) {
    let score = 0;
    for (const t of tokens) if (low.includes(t)) score += 1;
    if (score === 0) continue;
    // reward covering more of the query; gently prefer more specific (shorter) rubrics
    const coverage = score / tokens.length;
    const specificity = 1 / (1 + low.length / 40);
    scored.push({ rubric, score: coverage * 2 + specificity });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/** Split free text into symptom phrases and match each. */
export function translateSymptoms(rep: Repertory, text: string): PhraseResult[] {
  return text
    .split(/[\n;]+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((phrase) => ({ phrase, matches: findRubricsForPhrase(rep, phrase) }));
}
