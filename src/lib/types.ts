// ---------------------------------------------------------------------------
// Domain types — mirror the Supabase GraphRAG schema (see supabase/migrations).
// ---------------------------------------------------------------------------

export type NodeLabel =
  | 'REMEDY'
  | 'RUBRIC'
  | 'CHAPTER'
  | 'MODALITY'
  | 'MODERN_CONCEPT';

export type RelationshipType =
  | 'HAS_RUBRIC'
  | 'BELONGS_TO_CHAPTER'
  | 'AGGRAVATED_BY'
  | 'AMELIORATED_BY'
  | 'SYNONYM_OF'
  | 'RELATED_TO';

/** Repertory grade → weight mapping (Kent / Bönninghausen convention). */
export type RemedyGrade = 1 | 2 | 3 | 4;

export interface GraphNode {
  id: string;
  label: NodeLabel;
  name: string;
  properties: Record<string, unknown>;
  created_at?: string;
}

export interface GraphEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: RelationshipType;
  weight: number;
  properties: Record<string, unknown>;
  created_at?: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number | null;
  gender: string | null;
  notes: string | null;
  created_at: string;
}

export interface Case {
  id: string;
  patient_id: string;
  visit_date: string;
  symptoms_list: string[] | null;
  ai_rubrics_json: AiRubricSuggestion[] | null;
}

/** A rubric surfaced by AI analysis of free-text symptoms. */
export interface AiRubricSuggestion {
  rubric: string;
  chapter?: string;
  confidence: number;
  rationale?: string;
}

/** One row returned by the `graphrag_repertorize_symptoms` RPC. */
export interface RepertorizationResult {
  remedy_name: string;
  matched_rubrics_count: number;
  total_grading_score: number;
  matched_rubric_names: string[];
  relationship_paths: RelationshipPath[];
}

export interface RelationshipPath {
  rubric: string;
  relationship: RelationshipType;
  grade: number;
}

/** A rubric added to the repertorisation worksheet by the clinician. */
export interface WorksheetRubric {
  id: string;
  name: string;
  chapter?: string;
  /** Clinician-assigned intensity multiplier (1–4). */
  intensity: number;
}
