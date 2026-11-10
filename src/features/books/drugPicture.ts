// ---------------------------------------------------------------------------
// Rule-based "drug picture" distiller.
// Turns a remedy's narrative text (e.g. Tyler) into a scannable portrait by
// classifying its sentences into Constitution / Mind / Generals / Worse /
// Better. No AI required; if a backend key is later added this is where an LLM
// summary would slot in. Books that are already sectioned (Allen) are mapped
// heading by heading instead.
// ---------------------------------------------------------------------------

import { isSectioned, parseSections } from './sections';

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
    .map((s) =>
      s
        .trim()
        // "Influenza (Influenzin) Mind. — …": drop the stray alias before a label
        .replace(/^[A-Z][A-Za-z]+ \([^)]+\) (?=[A-Z][A-Za-z ]{1,30}\.\s*[—–-])/, '')
        // Boericke's "Ears. — Skin within…" reads as "Ears: Skin within…" in a list
        .replace(/^([A-Z][A-Za-z ,&'’()-]{1,40}?)\.\s*[—–-]+\s*/, '$1: '),
    )
    .filter((s) => s.length >= 24 && s.length <= 320);
}

/** A sentence that opens a Boericke section ("Head: …", after splitSentences). */
const SECTION_LABEL_RE = /^([A-Z][A-Za-z ,&'’()-]{1,40}?): /;

const escapeRe = (k: string) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Keyword matcher on word starts, so "thin" no longer hits "everything". */
function matcher(keys: string[]): (low: string) => boolean {
  const symbols = keys.filter((k) => /^[<>] $/.test(k));
  const words = keys.filter((k) => !symbols.includes(k)).map((k) => escapeRe(k.trim()));
  const re = new RegExp('\\b(?:' + words.join('|') + ')', 'i');
  return (low) => re.test(low) || symbols.some((k) => low.includes(k));
}

const isConstitution = matcher(CONSTITUTION);
const isMind = matcher(MIND);
const isWorse = matcher(WORSE);
const isBetter = matcher(BETTER);
const isGeneral = matcher(GENERAL);

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

// Allen already sorts his keynotes; map his headings straight onto the portrait.
const SECTION_BUCKET: Record<string, keyof DrugPicture> = {
  Constitution: 'constitution',
  'Mental Generals': 'mind',
  'Physical Generals': 'generals',
};
const CAP: Record<keyof DrugPicture, number> = { constitution: 6, mind: 7, generals: 8, worse: 6, better: 5 };
const STRUCTURED_CAP: Record<keyof DrugPicture, number> = {
  constitution: 8,
  mind: 10,
  generals: 12,
  worse: 12,
  better: 10,
};

/** "Evening and night; in a warm room (Hep.)." → ["Evening and night", "In a warm room (Hep.)"] */
function splitModality(s: string): string[] {
  return s
    .split(/;\s+/)
    .map((p) => p.trim().replace(/[.;,]+$/, ''))
    .filter((p) => p.length > 1)
    .map((p) => p[0].toUpperCase() + p.slice(1));
}

function distillSections(text: string): DrugPicture {
  const out: DrugPicture = { constitution: [], mind: [], generals: [], worse: [], better: [] };
  const push = (b: keyof DrugPicture, s: string) => {
    if (out[b].length < STRUCTURED_CAP[b]) out[b].push(s);
  };
  for (const { heading, items } of parseSections(text)) {
    if (heading === 'Modalities') {
      for (const it of items) {
        const label = it.label?.toLowerCase();
        if (label === 'aggravation') splitModality(it.text).forEach((s) => push('worse', s));
        else if (label === 'amelioration') splitModality(it.text).forEach((s) => push('better', s));
        else {
          const low = it.text.toLowerCase();
          if (isWorse(low)) push('worse', it.text);
          else if (isBetter(low)) push('better', it.text);
        }
      }
      continue;
    }
    const bucket = heading ? SECTION_BUCKET[heading] : undefined;
    if (!bucket) continue;
    for (const it of items) push(bucket, it.label ? `${it.label}: ${it.text}` : it.text);
  }
  return out;
}

/**
 * Distil a remedy text into a structured drug picture. Pass the remedy's
 * common name so a leading "Monkshood" is not read as part of the first
 * sentence.
 */
export function distill(text: string, commonName?: string | null): DrugPicture {
  if (!isSectioned(text)) return distillNarrative(text, commonName);
  // Allen: use his own classification; fill any section he leaves empty from
  // the keyword classifier so the portrait never has needless gaps.
  const out = distillSections(text);
  const keynotes = parseSections(text)
    .filter((s) => s.heading !== 'Relation')
    .flatMap((s) => s.items.map((i) => i.text))
    .join(' ');
  const fallback = distillNarrative(keynotes);
  for (const k of Object.keys(out) as (keyof DrugPicture)[]) {
    if (out[k].length === 0) out[k] = fallback[k];
  }
  return out;
}

/** Classify a narrative remedy text's sentences into a drug picture. */
function distillNarrative(text: string, commonName?: string | null): DrugPicture {
  if (commonName) text = text.replace(new RegExp('^\\s*' + escapeRe(commonName) + '\\s+'), '');
  const out: DrugPicture = {
    constitution: [],
    mind: [],
    generals: [],
    worse: [],
    better: [],
  };
  const seen = new Set<string>();
  // Boericke: constitution only comes from the opening general section; once
  // the first "Head: …" style section starts, symptoms are local.
  let inGeneralSection = true;
  for (const s of splitSentences(text)) {
    const low = s.toLowerCase();
    const label = SECTION_LABEL_RE.exec(s)?.[1];
    if (label && label !== 'Modalities') inGeneralSection = false;
    const key = low.slice(0, 40);
    if (seen.has(key) || isAnecdote(low)) continue;

    // priority: constitution → worse → better → mind → generals
    let bucket: keyof DrugPicture | null = null;
    if (inGeneralSection && isConstitution(low)) bucket = 'constitution';
    else if (isWorse(low)) bucket = 'worse';
    else if (isBetter(low)) bucket = 'better';
    else if (isMind(low)) bucket = 'mind';
    else if (isGeneral(low)) bucket = 'generals';
    if (!bucket) continue;

    if (out[bucket].length >= CAP[bucket]) continue;
    out[bucket].push(s);
    seen.add(key);
  }
  return out;
}
