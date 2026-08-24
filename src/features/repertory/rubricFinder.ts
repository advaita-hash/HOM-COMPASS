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
  // general modalities (mostly live in the Generalities chapter)
  motion: ['motion'], movement: ['motion'], moving: ['motion'], exertion: ['exertion'],
  rest: ['rest'], resting: ['rest'], touch: ['touch'], touched: ['touch'],
  pressure: ['pressure'], lying: ['lying'], standing: ['standing'], walking: ['walking'],
  sitting: ['sitting'], stooping: ['stooping'], ascending: ['ascending'],
  air: ['air'], outdoors: ['air', 'open'], outside: ['air', 'open'], open: ['open'],
  weather: ['weather'], storm: ['thunderstorm', 'storm'], thunder: ['thunderstorm'],
  thunderstorm: ['thunderstorm'], damp: ['damp', 'wet'], wet: ['wet'], humid: ['damp'],
  draft: ['draft'], draught: ['draft'], noise: ['noise'], light: ['light'],
  company: ['company'], alone: ['alone'], solitude: ['alone'], eating: ['eating'],
  drinking: ['drinking'], periodic: ['periodical'], periodical: ['periodical'],
  menses: ['menses'], period: ['menses'], periods: ['menses'], pregnancy: ['pregnancy'],
  right: ['right'], left: ['left'], side: ['side'], seaside: ['seashore'],
  sun: ['sun'], sunlight: ['sun'], jar: ['jar'], jarring: ['jar'], bathing: ['bathing'],
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

/** If a phrase names one of these, it's a local (not general) symptom. */
const BODY_PARTS = new Set(
  `head eye eyes ear ears nose face mouth teeth tooth tongue throat stomach abdomen
   belly rectum stool bladder kidney kidneys urine urethra chest lung lungs back
   spine cough larynx heart extremities limb limbs arm arms hand hands finger fingers
   leg legs foot feet knee knees ankle shoulder hip neck skin hair scalp nail nails
   vertigo head`
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
  // does the phrase reference a body part? if not, it's a general symptom and
  // Generalities rubrics should be preferred.
  const bodyRefs = tokens.some((t) => BODY_PARTS.has(t));
  const idx = indexOf(rep);
  const scored: RubricMatch[] = [];
  for (const { rubric, low } of idx) {
    let score = 0;
    for (const t of tokens) if (low.includes(t)) score += 1;
    if (score === 0) continue;
    // reward covering more of the query; gently prefer more specific (shorter) rubrics
    const coverage = score / tokens.length;
    const specificity = 1 / (1 + low.length / 40);
    // surface general modalities from the Generalities chapter when no body part
    // was named (e.g. "worse in warm rooms", "better in open air").
    const generalBonus =
      !bodyRefs && rubric.chapter.toLowerCase() === 'generalities' ? 0.6 : 0;
    scored.push({ rubric, score: coverage * 2 + specificity + generalBonus });
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
