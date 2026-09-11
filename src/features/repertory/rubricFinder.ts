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
  // everyday / lay language → repertory terms (so plain speech maps correctly)
  tummy: ['abdomen'], gut: ['abdomen'], guts: ['abdomen'], stomachache: ['abdomen', 'pain'],
  ache: ['pain'], aches: ['pain'], aching: ['pain'], achy: ['pain'],
  hurts: ['pain'], hurting: ['pain'], sore: ['pain'], soreness: ['pain'],
  pee: ['urination'], peeing: ['urination'], wee: ['urination'], urinate: ['urination'],
  poop: ['stool'], poo: ['stool'], stools: ['stool'],
  puke: ['vomiting'], puking: ['vomiting'], vomit: ['vomiting'], queasy: ['nausea'],
  lightheaded: ['vertigo'], woozy: ['vertigo'], giddy: ['vertigo'],
  snot: ['coryza'], snotty: ['coryza'], sneezy: ['sneezing'],
  breathless: ['respiration'], wheezy: ['asthma', 'respiration'],
  rash: ['eruptions'], rashes: ['eruptions'], spots: ['eruptions'],
  constipated: ['constipation'], wind: ['flatulence'], windy: ['flatulence'],
  burp: ['eructations'], burping: ['eructations'], belching: ['eructations'], belch: ['eructations'],
  cramps: ['cramp'], crampy: ['cramp'], feverish: ['fever'],
  knackered: ['weakness'], drained: ['weakness'], poorly: ['prostration'],
  jittery: ['restlessness'], antsy: ['restlessness'],
  down: ['sadness'], low: ['sadness'], grumpy: ['irritability'], moody: ['irritability'],
  cross: ['irritability'], itch: ['itching'],
};

/**
 * Multi-word everyday expressions → repertory terms. Applied to the whole
 * phrase before tokenising, so "tummy ache" becomes "abdomen pain", not two
 * separate (and easily mis-matched) words.
 */
const LAY_PHRASES: [RegExp, string][] = [
  [/tummy ache|belly ache|stomach ?ache|upset stomach/, 'abdomen pain'],
  [/ear ?ache/, 'ear pain'],
  [/tooth ?ache/, 'teeth pain'],
  [/head ?ache/, 'head pain'],
  [/back ?ache/, 'back pain'],
  [/sore throat/, 'throat pain'],
  [/throw(?:ing)? up/, 'vomiting'],
  [/feel(?:ing)? sick/, 'nausea'],
  [/can'?t sleep|cannot sleep|trouble sleeping/, 'sleeplessness'],
  [/out of breath|short of breath/, 'respiration difficult'],
  [/runny nose/, 'coryza'],
  [/stuffy nose|blocked nose|bunged up/, 'nose obstruction'],
  [/pins and needles/, 'tingling numbness'],
  [/hot flush(?:es)?|hot flash(?:es)?/, 'heat flushes'],
  [/the runs|loose motions?/, 'diarrhoea'],
];

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

/**
 * Body-part / symptom word → the repertory chapter(s) it belongs to, so that a
 * local symptom is scored against the RIGHT chapter (e.g. "knee" → Extremities)
 * instead of leaking into short generic rubrics in other chapters.
 * Chapter strings match the repertory's chapter names (lower-cased).
 */
const BODY_TO_CHAPTER: Record<string, string[]> = {};
function mapBody(words: string, chapters: string[]) {
  for (const w of words.split(/\s+/).filter(Boolean)) BODY_TO_CHAPTER[w] = chapters;
}
mapBody('vertigo dizzy dizziness giddy', ['vertigo']);
mapBody('head headache forehead temple temples occiput migraine', ['head']);
mapBody('eye eyes eyelid lachrymation', ['eye']);
mapBody('vision sight blurred', ['vision']);
mapBody('ear ears earache otorrhoea', ['ear']);
mapBody('hearing deaf deafness', ['hearing']);
mapBody('nose nostril coryza smell sneezing epistaxis nosebleed', ['nose']);
mapBody('face cheek cheeks jaw', ['face']);
mapBody('mouth gum gums tongue palate saliva salivation', ['mouth']);
mapBody('teeth tooth toothache', ['teeth']);
mapBody('throat tonsil tonsils pharynx swallowing', ['throat']);
mapBody('stomach gastric nausea vomiting eructation heartburn', ['stomach']);
mapBody('abdomen belly umbilical navel liver spleen colic hypochondrium flatulence', ['abdomen']);
mapBody('rectum anus piles haemorrhoids', ['rectum']);
mapBody('stool diarrhoea diarrhea constipation', ['stool', 'rectum']);
mapBody('bladder urination micturition', ['bladder']);
mapBody('urine urination', ['urine']);
mapBody('kidney kidneys', ['kidneys']);
mapBody('urethra', ['urethra']);
mapBody('chest lung lungs breast mammae ribs', ['chest']);
mapBody('back spine lumbar sacral cervical dorsal', ['back']);
mapBody(
  'extremities limb limbs arm arms hand hands finger fingers leg legs foot feet knee ' +
    'knees ankle ankles hip thigh calf calves toe toes shoulder elbow wrist nail nails joint joints',
  ['extremities'],
);
mapBody('skin eruption eruptions rash itching pimples', ['skin']);
mapBody('cough coughing', ['cough']);
mapBody('expectoration sputum phlegm', ['expectoration']);
mapBody('respiration breathing breath breathless dyspnoea asthma', ['respiration']);
mapBody('heart palpitation palpitations pulse', ['heart & circulation']);
mapBody('sleep sleeplessness insomnia sleepy drowsy dreams', ['sleep']);
mapBody('larynx voice hoarse hoarseness', ['larynx and trachea']);
mapBody('appetite hunger hungry thirst thirsty', ['appetite']);
mapBody('chill chilliness chilly', ['chill']);
mapBody('fever feverish', ['fever']);
mapBody('perspiration sweat sweating', ['perspiration']);
mapBody('genitals sexual libido erection', ['genitalia male', 'genitalia female']);
mapBody('menses menstrual leucorrhoea vagina uterus ovary', ['genitalia female']);
// lay body words
mapBody('tummy gut guts', ['abdomen']);
mapBody('pee wee urinate peeing', ['urine', 'bladder']);
mapBody('poop poo', ['stool', 'rectum']);
mapBody('snot snotty', ['nose']);
mapBody('rash rashes spots', ['skin']);

export interface RubricMatch {
  rubric: Rubric;
  score: number;
}

export interface PhraseResult {
  phrase: string;
  matches: RubricMatch[];
}

// cache lowercased rubric paths + their whole-word sets, per repertory object.
// The word set lets us match a token as a COMPLETE word (never a fragment
// hiding inside another word, e.g. "air" must not match "chair"/"despair").
interface IndexedRubric {
  rubric: Rubric;
  low: string;
  words: Set<string>;
}
const cache = new WeakMap<Repertory, IndexedRubric[]>();
function indexOf(rep: Repertory): IndexedRubric[] {
  let idx = cache.get(rep);
  if (!idx) {
    idx = rep.rubrics.map((r) => {
      const low = r.rubric.toLowerCase();
      return {
        rubric: r,
        low,
        words: new Set(low.split(/[^a-z]+/).filter(Boolean)),
      };
    });
    cache.set(rep, idx);
  }
  return idx;
}

function expandTokens(phrase: string): string[] {
  const lc = phrase.toLowerCase();
  // expand multi-word everyday expressions first ("tummy ache" → "abdomen pain")
  let extra = '';
  for (const [re, term] of LAY_PHRASES) if (re.test(lc)) extra += ' ' + term;
  const words = `${lc} ${extra}`
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

/** True when a word already has a built-in repertory sense (synonym or body
 *  map) — used to stop the AI layer from re-translating known words. */
export function hasCuratedSense(word: string): boolean {
  const w = word.toLowerCase();
  return w in SYNONYMS || w in BODY_TO_CHAPTER;
}

/** Find candidate rubrics for one plain-language phrase. */
export function findRubricsForPhrase(
  rep: Repertory,
  phrase: string,
  limit = 8,
): RubricMatch[] {
  const tokens = expandTokens(phrase);
  if (tokens.length === 0) return [];
  // which chapters does this phrase target? (body parts → their chapters)
  const targetChapters = new Set<string>();
  for (const t of tokens) for (const ch of BODY_TO_CHAPTER[t] ?? []) targetChapters.add(ch);
  const bodyRefs = targetChapters.size > 0;

  const idx = indexOf(rep);
  const scored: RubricMatch[] = [];
  for (const { rubric, low, words } of idx) {
    let score = 0;
    for (const t of tokens) if (words.has(t)) score += 1; // whole-word match only
    if (score === 0) continue;
    const coverage = score / tokens.length;
    const specificity = 1 / (1 + low.length / 40);
    const chap = rubric.chapter.toLowerCase();
    // steer local symptoms to the right chapter, general symptoms to Generalities
    const chapterBonus = bodyRefs && targetChapters.has(chap) ? 0.8 : 0;
    const generalBonus = !bodyRefs && chap === 'generalities' ? 0.6 : 0;
    scored.push({
      rubric,
      score: coverage * 2 + specificity * 0.5 + chapterBonus + generalBonus,
    });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit);
}

/**
 * Find causation ("ailments from…") rubrics for a probable causative factor —
 * e.g. "grief", "fright", "disappointed love", "getting wet", "injury".
 * Prefers etiological rubrics (those containing "ailments" / in Generalities).
 */
export function findCausation(rep: Repertory, phrase: string, limit = 8): RubricMatch[] {
  const tokens = expandTokens(phrase);
  if (tokens.length === 0) return [];
  const idx = indexOf(rep);
  const scored: RubricMatch[] = [];
  for (const { rubric, low, words } of idx) {
    let score = 0;
    for (const t of tokens) if (words.has(t)) score += 1; // whole-word match only
    if (score === 0) continue;
    const coverage = score / tokens.length;
    const isEtiology = low.includes('ailments') || low.includes(', from') || low.includes(', after');
    const etioBonus = isEtiology ? 1.5 : 0;
    const genBonus = rubric.chapter.toLowerCase() === 'generalities' ? 0.4 : 0;
    if (!isEtiology && genBonus === 0 && coverage < 0.75) continue; // keep it causation-focused
    scored.push({ rubric, score: coverage * 2 + etioBonus + genBonus });
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
