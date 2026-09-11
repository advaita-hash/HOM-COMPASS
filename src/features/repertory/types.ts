/** Repertory grade → weight (Kent convention: grade 1 plain … grade 3/4 bold). */
export type Grade = 1 | 2 | 3 | 4;

export interface RubricRemedy {
  /** Remedy name (matches Materia Medica / book slugs where possible). */
  name: string;
  grade: Grade;
}

export interface Rubric {
  id: string;
  chapter: string;
  /** Full rubric text, e.g. "Anxiety, health, about". */
  rubric: string;
  remedies: RubricRemedy[];
}

export interface Repertory {
  id: string;
  title: string;
  author: string;
  source: string;
  note?: string;
  chapters: string[];
  rubricCount: number;
  rubrics: Rubric[];
}

/** A rubric placed on the repertorisation worksheet, with clinician weight. */
export interface WorksheetItem {
  rubricId: string;
  /** Clinician intensity multiplier (1–3). */
  intensity: number;
}

/** Computed score for one remedy across the worksheet rubrics. */
export interface RemedyScore {
  name: string;
  /** Number of worksheet rubrics the remedy appears in. */
  rubricsCovered: number;
  /** Sum of (grade × rubric intensity). */
  totalScore: number;
  /** Per-rubric grade, keyed by rubricId (0 = absent). */
  grades: Record<string, number>;
}
