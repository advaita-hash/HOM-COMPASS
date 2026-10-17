// ---------------------------------------------------------------------------
// Demo Materia Medica — a compact set of classic polychrests with short-form
// content. Used by "Remedy of the Day" and the Materia Medica module when the
// app runs without a Supabase backend (demo mode).
//
// Content reflects classical teaching (Kent / Boericke / Allen) and is intended
// for study only — not a substitute for a practitioner's full repertorisation.
// ---------------------------------------------------------------------------

export interface Remedy {
  /** URL-safe slug, e.g. 'pulsatilla'. */
  id: string;
  /** Latin/pharmacopoeial name, e.g. 'Pulsatilla'. */
  name: string;
  /** Repertory abbreviation, e.g. 'Puls.'. */
  abbr: string;
  /** Common name, e.g. 'Wind Flower'. */
  commonName: string;
  /** Source/kingdom, e.g. 'Plant · Ranunculaceae'. */
  source: string;
  /** One-line portrait of the remedy picture. */
  essence: string;
  /** Confirmatory keynotes. */
  keynotes: string[];
  /** Mind & emotional state. */
  mind: string[];
  /** Physical generals. */
  generals: string[];
  /** Aggravations (worse from). */
  worse: string[];
  /** Ameliorations (better from). */
  better: string[];
  /** Representative repertory rubrics. */
  keyRubrics: string[];
}

export const REMEDIES: Remedy[] = [
  {
    id: 'pulsatilla',
    name: 'Pulsatilla',
    abbr: 'Puls.',
    commonName: 'Wind Flower',
    source: 'Plant · Ranunculaceae',
    essence:
      'The gentle, weepy, changeable patient who craves company, consolation and open air.',
    keynotes: [
      'Mild, yielding, tearful disposition; weeps while telling symptoms',
      'Symptoms changeable and wandering — no two attacks alike',
      'Thirstlessness, even with a dry mouth',
      'Bland, thick, yellow-green discharges',
    ],
    mind: [
      'Weeps easily and is markedly better for consolation',
      'Timid, clingy, needs reassurance and company',
      'Moods shift quickly from tears to laughter',
    ],
    generals: [
      'Thirstless; craves fresh, cool, open air',
      'Complaints wander from part to part',
      'Worse from rich, fatty food',
    ],
    worse: ['Warmth & stuffy rooms', 'Evening', 'Rich / fatty food', 'Puberty, menses'],
    better: ['Open air', 'Gentle motion', 'Cold applications', 'Consolation'],
    keyRubrics: [
      'Mind — weeping, consolation ameliorates',
      'Generalities — thirstlessness',
      'Stomach — aversion to fat',
      'Aggravation — warm room',
    ],
  },
  {
    id: 'nux-vomica',
    name: 'Nux Vomica',
    abbr: 'Nux-v.',
    commonName: 'Poison Nut',
    source: 'Plant · Loganiaceae',
    essence:
      'The driven, irritable, oversensitive overachiever undone by stimulants and stress.',
    keynotes: [
      'Irritable, impatient, fault-finding, cannot bear contradiction',
      'Oversensitive to noise, light, odours',
      'Ailments from overwork, coffee, alcohol, rich food',
      'Ineffectual urging for stool or urine',
    ],
    mind: [
      'Ambitious, competitive, zealous, angry',
      'Time-pressured; everything must be done at once',
    ],
    generals: [
      'Very chilly',
      'Worse early morning (~3–4 a.m.) and after eating',
      'Spasmodic, cramping digestive complaints',
    ],
    worse: ['Early morning', 'Cold', 'Stimulants', 'Mental exertion', 'Anger'],
    better: ['Warmth', 'Rest', 'A short nap', 'Evening'],
    keyRubrics: [
      'Mind — irritability',
      'Rectum — urging, ineffectual',
      'Generalities — coffee aggravates',
      'Generalities — 3 a.m. aggravation',
    ],
  },
  {
    id: 'sulphur',
    name: 'Sulphur',
    abbr: 'Sulph.',
    commonName: 'Brimstone / Flowers of Sulphur',
    source: 'Mineral · Element',
    essence:
      "The 'ragged philosopher' — warm, untidy, theorising, with burning heats and itching skin.",
    keynotes: [
      'Burning heats — soles burn at night, kicks feet out of covers',
      'Sinking hunger around 11 a.m.',
      'Offensive discharges; redness of orifices',
      'Skin itches, worse washing and warmth of bed',
    ],
    mind: [
      'Speculative, absorbed in ideas and theories',
      'Careless of appearance; self-satisfied',
    ],
    generals: [
      'Warm-blooded; aggravated by heat of bed',
      'Craves sweets, fat and spicy food',
      'Aggravated by standing and by bathing',
    ],
    worse: ['Warmth of bed', 'Washing / bathing', '11 a.m.', 'Standing'],
    better: ['Dry, warm weather', 'Motion', 'Open air'],
    keyRubrics: [
      'Generalities — heat, flushes of',
      'Skin — itching, worse warmth',
      'Extremities — burning soles of feet',
      'Stomach — 11 a.m. faintness',
    ],
  },
  {
    id: 'lycopodium',
    name: 'Lycopodium',
    abbr: 'Lyc.',
    commonName: 'Club Moss',
    source: 'Plant · Lycopodiaceae',
    essence:
      'Anticipatory anxiety and low self-confidence masked by bluster; right-sided and digestive, worse 4–8 p.m.',
    keynotes: [
      'Worse 4–8 p.m.',
      'Right-sided, or symptoms moving right → left',
      'Bloating and gas; fullness after a few mouthfuls',
      'Craves warm food and drinks, and sweets',
    ],
    mind: [
      'Low self-confidence; dreads new tasks yet performs well',
      'Cowardly at home, domineering outside; irritable on waking',
      'Anticipatory anxiety before an ordeal',
    ],
    generals: [
      'Digestive flatulence and distension',
      'Desires warm drinks',
      'Symptoms predominantly right-sided',
    ],
    worse: ['4–8 p.m.', 'Right side', 'Cold food', 'Pressure of clothes'],
    better: ['Warm food & drinks', 'Motion', 'After midnight', 'Uncovering'],
    keyRubrics: [
      'Mind — ailments from anticipation',
      'Abdomen — flatulence',
      'Generalities — 16–20 h aggravation',
      'Mind — cowardice',
    ],
  },
  {
    id: 'natrum-muriaticum',
    name: 'Natrum Muriaticum',
    abbr: 'Nat-m.',
    commonName: 'Sea Salt / Sodium Chloride',
    source: 'Mineral · Salt',
    essence:
      'Silent grief held behind a dignified, closed exterior; worse consolation and sun.',
    keynotes: [
      'Ailments from grief and disappointed love',
      'Reserved; strongly dislikes sympathy and consolation',
      'Craving for salt',
      'Worse from sun and around 10–11 a.m.',
    ],
    mind: [
      'Introverted; dwells on past hurts and offences',
      'Weeps alone, never in company; worse for consolation',
    ],
    generals: [
      'Dryness of mucous membranes',
      'Hammering headaches, worse sun',
      'Craves salt; may be worse at the seaside',
    ],
    worse: ['Consolation', 'Sun & heat', '10–11 a.m.', 'Mental exertion', 'Grief'],
    better: ['Open air', 'Cold bathing', 'Being alone', 'Sweating'],
    keyRubrics: [
      'Mind — consolation aggravates',
      'Mind — grief, silent',
      'Generalities — salt, desire for',
      'Head — pain, sun from',
    ],
  },
  {
    id: 'arsenicum-album',
    name: 'Arsenicum Album',
    abbr: 'Ars.',
    commonName: 'White Oxide of Arsenic',
    source: 'Mineral · Element',
    essence:
      'Anxious, restless, fastidious perfectionist with burning pains relieved by heat; deep fear of death and disease.',
    keynotes: [
      'Anxiety about health, order and security',
      'Restlessness with prostration — changes place constantly',
      'Burning pains, paradoxically better from heat',
      'Thirst for frequent small sips; worse after midnight (1–2 a.m.)',
    ],
    mind: [
      'Fastidious and controlling',
      'Fear of death, of disease, and of being left alone',
    ],
    generals: [
      'Very chilly',
      'Marked periodicity of complaints',
      'Exhaustion out of proportion to illness',
    ],
    worse: ['After midnight (1–3 a.m.)', 'Cold', 'Being alone', 'Exertion'],
    better: ['Heat & warm drinks', 'Company', 'Head raised', 'Motion'],
    keyRubrics: [
      'Mind — fear of death',
      'Mind — fastidious',
      'Generalities — burning, better heat',
      'Generalities — restlessness, anxious',
    ],
  },
  {
    id: 'phosphorus',
    name: 'Phosphorus',
    abbr: 'Phos.',
    commonName: 'Phosphorus',
    source: 'Mineral · Element',
    essence:
      'Open, sympathetic and impressionable; craves company and cold drinks; bleeds and startles easily.',
    keynotes: [
      'Sympathetic and affectionate; needs company and reassurance',
      'Many fears — dark, thunderstorms, being alone, disease',
      'Craves cold drinks (may vomit once warm in the stomach)',
      'Easy bleeding; burning between the shoulder blades',
    ],
    mind: [
      'Warm, expressive, easily impressed by surroundings',
      'Much better for company, touch and being rubbed',
    ],
    generals: [
      'Tall, slender, thirsty for ice-cold water',
      'Worse lying on the left side and at twilight',
    ],
    worse: ['Twilight', 'Lying on left side', 'Cold', 'Thunderstorm', 'Warm food/drink'],
    better: ['Company', 'Sleep', 'Cold food', 'Being rubbed / massaged'],
    keyRubrics: [
      'Mind — company, desire for',
      'Generalities — cold drinks, desire',
      'Chest — haemorrhage, tendency to',
      'Mind — fear, thunderstorm',
    ],
  },
  {
    id: 'belladonna',
    name: 'Belladonna',
    abbr: 'Bell.',
    commonName: 'Deadly Nightshade',
    source: 'Plant · Solanaceae',
    essence: 'Sudden, violent, hot, red and throbbing acute states.',
    keynotes: [
      'Sudden, intense onset',
      'Heat, redness, throbbing and burning',
      'Dilated pupils; hypersensitive to light, noise and jarring',
      'Right-sided; delirium with high fever',
    ],
    mind: [
      'Acute delirium, may strike or bite',
      'Hallucinations, often of animals',
    ],
    generals: [
      'Radiating heat and dry, burning skin',
      'Throbbing carotids; worse around 3 p.m.',
    ],
    worse: ['Touch', 'Jar', 'Noise & light', 'Lying down', 'Afternoon (3 p.m.)'],
    better: ['Semi-erect posture', 'Warmth', 'Rest in a dark, quiet room'],
    keyRubrics: [
      'Generalities — inflammation, sudden',
      'Head — congestion, throbbing',
      'Fever — heat, burning',
      'Mind — delirium, fierce',
    ],
  },
  {
    id: 'bryonia',
    name: 'Bryonia Alba',
    abbr: 'Bry.',
    commonName: 'White Bryony / Wild Hop',
    source: 'Plant · Cucurbitaceae',
    essence:
      'Worse from the slightest motion; dry, irritable, wants to lie still and be left alone.',
    keynotes: [
      'Worse from any motion; better firm pressure and rest',
      'Dryness of all mucous membranes',
      'Great thirst for large quantities at long intervals',
      'Stitching, tearing pains',
    ],
    mind: [
      'Irritable; wants to be left alone',
      'Business-minded and anxious about money even when ill; “wants to go home”',
    ],
    generals: [
      'Worse warmth and exertion; better lying on the painful side',
      'Dry, hard stool as if burnt',
    ],
    worse: ['Motion', 'Exertion', 'Warmth', '9 p.m.', 'Eating'],
    better: ['Firm pressure', 'Rest', 'Lying on the painful side', 'Cool, open air'],
    keyRubrics: [
      'Generalities — motion aggravates',
      'Generalities — thirst, large quantities',
      'Chest — inflammation, stitching pain',
      'Mind — talk of business',
    ],
  },
  {
    id: 'aconitum-napellus',
    name: 'Aconitum Napellus',
    abbr: 'Acon.',
    commonName: 'Monkshood',
    source: 'Plant · Ranunculaceae',
    essence:
      'Sudden ailments from fright or cold dry wind, with intense fear and restlessness.',
    keynotes: [
      'Very sudden, violent onset after fright or cold dry wind',
      'Intense anxiety and fear of death — may predict the hour of death',
      'Great restlessness',
      'First stage of acute, feverish complaints',
    ],
    mind: [
      'Panic, fear of death, ailments from shock or fright',
      'Restless tossing with anguish',
    ],
    generals: [
      'Worse cold dry wind and at night',
      'Thirst for cold water; dry, hot skin',
    ],
    worse: ['Cold dry wind', 'Night', 'Fright', 'Warm room'],
    better: ['Open air', 'Rest', 'Sweating'],
    keyRubrics: [
      'Mind — fear of death, predicts time',
      'Mind — ailments from fright',
      'Fever — heat, first stage',
      'Generalities — cold, dry wind agg.',
    ],
  },
  {
    id: 'sepia',
    name: 'Sepia',
    abbr: 'Sep.',
    commonName: 'Cuttlefish Ink',
    source: 'Animal · Mollusc',
    essence:
      'Worn-out and indifferent to loved ones, with dragging-down pelvic complaints; better for vigorous exercise.',
    keynotes: [
      'Indifference to family and duties once loved',
      'Bearing-down pelvic sensation — must cross the legs',
      'Worse before menses and from cold; hormonal / menopausal states',
      'Better from vigorous exertion (e.g. dancing)',
    ],
    mind: [
      'Irritable, wants to be alone; averse to consolation',
      'Weeps when telling symptoms; sadness with indifference',
    ],
    generals: [
      'Chilly, with sluggish circulation',
      'Yellow “saddle” across the nose',
    ],
    worse: ['Cold', 'Before menses', 'Consolation', 'Standing', 'Sexual excess'],
    better: ['Vigorous exercise', 'Warmth', 'Open air', 'Occupation'],
    keyRubrics: [
      'Mind — indifference to loved ones',
      'Female — bearing-down sensation',
      'Generalities — exertion ameliorates',
      'Mind — consolation aggravates',
    ],
  },
  {
    id: 'calcarea-carbonica',
    name: 'Calcarea Carbonica',
    abbr: 'Calc.',
    commonName: 'Carbonate of Lime (Oyster Shell)',
    source: 'Mineral · Animal',
    essence:
      'The steady, chilly, sweaty, apprehensive worker who fears failure and being overwhelmed.',
    keynotes: [
      'Chilly with clammy sweat; head sweats in sleep, wetting the pillow',
      'Sluggish, easily fatigued, obstinate',
      'Fears failure, misfortune, and that others notice confusion',
      'Craves eggs and indigestible things',
    ],
    mind: [
      'Apprehensive; overwhelmed by workload',
      'Obstinate; dreads observation of her difficulties',
    ],
    generals: [
      'Flabby, chilly, worse cold damp',
      'Sour discharges and sweat; slow dentition / development',
    ],
    worse: ['Cold, damp weather', 'Exertion', 'Ascending', 'Dentition'],
    better: ['Dry warm weather', 'Lying on the painful side', 'Constipation'],
    keyRubrics: [
      'Mind — fear of failure',
      'Head — perspiration during sleep',
      'Generalities — cold, damp aggravates',
      'Stomach — desires eggs',
    ],
  },
];

/**
 * Deterministically pick the "Remedy of the Day" from the day of the year, so
 * every clinician sees the same remedy on a given date and it rotates daily.
 */
export function remedyOfTheDay(date: Date = new Date()): Remedy {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0);
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const dayOfYear = Math.floor((today - startOfYear) / 86_400_000);
  return REMEDIES[dayOfYear % REMEDIES.length];
}

export function getRemedyById(id: string): Remedy | undefined {
  return REMEDIES.find((r) => r.id === id);
}
