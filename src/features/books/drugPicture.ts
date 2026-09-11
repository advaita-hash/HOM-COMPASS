// ---------------------------------------------------------------------------
// Rule-based "drug picture" distiller.
// Turns a remedy's narrative text (e.g. Tyler) into a scannable portrait by
// classifying its sentences into Constitution / Mind / Generals / Worse /
// Better. No AI required; if a backend key is later added this is where an LLM
// summary would slot in.
// ---------------------------------------------------------------------------

export interface DrugPicture {
  constitution: string[];
  mind: string[];
  generals: string[];
  worse: string[];
  better: string[];
}

const CONSTITUTION = [
  'hair', 'blue eyes', 'complexion', 'fleshy', 'fat ', 'stout', 'thin', 'lean',
  'build', 'temperament', 'disposition', 'adapted', 'suited', 'suitable',
  'phlegmatic', 'sanguine', 'bilious', 'constitution', 'blonde', 'blond',
  'sandy', 'pale face', 'plump', 'flabby', 'scrofulous', 'tall',
  'obese', 'emaciat', 'complexioned',
];
const MIND = [
  'mind', 'mental', 'fear', 'weep', 'tears', 'irritab', 'anxi', 'sad', 'grief',
  'memory', 'forgetful', 'jealous', 'suspicious', 'timid', 'mild', 'yielding',
  'restless', 'hurried', 'hurry', 'delusion', 'dream', 'consolation', 'sympathy',
  'anger', 'angry', 'weary of life', 'despair', 'confusion', 'clairvoy',
];
const WORSE = ['worse', 'aggravat', '< ', 'agg.'];
const BETTER = ['better', 'ameliorat', 'relieved', 'relief', '> ', 'amel'];
const GENERAL = [
  'thirst', 'appetite', 'craves', 'crave', 'desires', 'aversion', 'discharge',
  'catarrh', 'menses', 'stool', 'sleep', 'chill', 'heat', 'sweat', 'perspir',
  'burning', 'pain', 'side', 'motion', 'open air', 'skin', 'cough', 'stomach',
  'wandering',
];

function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?”"])\s+(?=[A-Z“"])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 24 && s.length <= 320);
}

function hasAny(low: string, keys: string[]): boolean {
  return keys.some((k) => low.includes(k));
}

// Tyler is full of clinical anecdotes; skip them so the portrait keeps only
// descriptive statements about the remedy type.
const ANECDOTE = [
  'woman of', 'man of', 'girl of', 'boy of', 'child of', 'one remembers',
  'i remember', 'hospital', "years' duration", 'aged ', 'our doctors',
  'a case', 'cases:', 'she was', 'he was', 'gave him', 'gave her', 'who came',
  'came to', 'was cured', 'was given', 'patient has', 'months ago', 'seen a few',
  'one of our', 'we saw', 'burnett', 'kent says', 'hahnemann says', 'he says',
  'he tells us', 'introduced', 'proved by', 'physicians', 'no one must',
  'homoeopathy', 'black type', 'also stands', 'nosode', 'potentiz', 'provings',
];
function isAnecdote(low: string): boolean {
  return ANECDOTE.some((k) => low.includes(k));
}

/** Distil a narrative remedy text into a structured drug picture. */
export function distill(text: string): DrugPicture {
  const out: DrugPicture = {
    constitution: [],
    mind: [],
    generals: [],
    worse: [],
    better: [],
  };
  const seen = new Set<string>();
  for (const s of splitSentences(text)) {
    const low = s.toLowerCase();
    const key = low.slice(0, 40);
    if (seen.has(key) || isAnecdote(low)) continue;

    // priority: constitution → worse → better → mind → generals
    let bucket: keyof DrugPicture | null = null;
    if (hasAny(low, CONSTITUTION)) bucket = 'constitution';
    else if (hasAny(low, WORSE)) bucket = 'worse';
    else if (hasAny(low, BETTER)) bucket = 'better';
    else if (hasAny(low, MIND)) bucket = 'mind';
    else if (hasAny(low, GENERAL)) bucket = 'generals';
    if (!bucket) continue;

    const cap: Record<keyof DrugPicture, number> = {
      constitution: 6,
      mind: 7,
      generals: 8,
      worse: 6,
      better: 5,
    };
    if (out[bucket].length >= cap[bucket]) continue;
    out[bucket].push(s);
    seen.add(key);
  }
  return out;
}
