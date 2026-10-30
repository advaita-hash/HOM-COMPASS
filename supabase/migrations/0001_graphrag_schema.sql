-- ===========================================================================
-- HOM-COMPASS · GraphRAG knowledge-graph schema
-- Node/Edge relational model + pgvector for hybrid entity resolution.
-- ===========================================================================

-- Enable vector extension for hybrid node matching
CREATE EXTENSION IF NOT EXISTS vector;

-- ---------------------------------------------------------------------------
-- 1. Patients
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  age INTEGER,
  gender TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ---------------------------------------------------------------------------
-- 2. Cases
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  visit_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  symptoms_list TEXT[],
  ai_rubrics_json JSONB
);

-- ---------------------------------------------------------------------------
-- 3. Knowledge graph — Nodes
--    (Remedies, Rubrics, Chapters, Modalities, Modern Concepts)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS graph_nodes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,                 -- 'REMEDY' | 'RUBRIC' | 'CHAPTER' | 'MODALITY' | 'MODERN_CONCEPT'
  name TEXT NOT NULL,                  -- 'Pulsatilla', 'Anxiety in a crowd', 'Mind', ...
  properties JSONB DEFAULT '{}'::jsonb, -- source book, full-text snippets, extra metadata
  embedding VECTOR(1536),             -- vector representation for hybrid GraphRAG lookup
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS graph_nodes_embedding_idx
  ON graph_nodes USING hnsw (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS graph_nodes_label_idx ON graph_nodes(label);

-- ---------------------------------------------------------------------------
-- 4. Knowledge graph — Edges (relationships)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS graph_edges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_node_id UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
  target_node_id UUID REFERENCES graph_nodes(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,     -- 'HAS_RUBRIC' | 'BELONGS_TO_CHAPTER' | 'AGGRAVATED_BY' | 'SYNONYM_OF' ...
  weight DOUBLE PRECISION DEFAULT 1.0, -- grade weight (Grade 1=1.0, 2=2.0, 3=3.0, 4=4.0)
  properties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS graph_edges_source_target_idx
  ON graph_edges(source_node_id, target_node_id);

CREATE INDEX IF NOT EXISTS graph_edges_rel_type_idx
  ON graph_edges(relationship_type);

-- ---------------------------------------------------------------------------
-- 5. GraphRAG traversal RPC — multi-hop repertorisation
--    symptom embeddings -> matched rubric nodes -> remedy nodes -> aggregate
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION graphrag_repertorize_symptoms(
  symptom_embeddings vector[],
  match_threshold float DEFAULT 0.25,
  max_rubrics int DEFAULT 30
)
RETURNS TABLE (
  remedy_name TEXT,
  matched_rubrics_count BIGINT,
  total_grading_score DOUBLE PRECISION,
  matched_rubric_names TEXT[],
  relationship_paths JSONB
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  WITH matched_rubric_nodes AS (
    -- Step 1: hybrid entity matching — nearest rubric/modality nodes by cosine distance
    SELECT DISTINCT n.id AS rubric_id, n.name AS rubric_name
    FROM graph_nodes n
    JOIN unnest(symptom_embeddings) AS input_vector ON 1 = 1
    WHERE n.label IN ('RUBRIC', 'MODALITY', 'MODERN_CONCEPT')
      AND 1 - (n.embedding <=> input_vector) >= match_threshold
    LIMIT max_rubrics
  ),
  graph_traversal AS (
    -- Step 2: multi-hop traversal (rubric node -> HAS_RUBRIC edge -> remedy node)
    SELECT
      r_node.name AS remedy,
      rub.rubric_name,
      e.weight AS grade_weight,
      jsonb_build_object(
        'rubric', rub.rubric_name,
        'relationship', e.relationship_type,
        'grade', e.weight
      ) AS path_info
    FROM matched_rubric_nodes rub
    JOIN graph_edges e
      ON e.target_node_id = rub.rubric_id OR e.source_node_id = rub.rubric_id
    JOIN graph_nodes r_node
      ON (r_node.id = e.source_node_id OR r_node.id = e.target_node_id)
    WHERE r_node.label = 'REMEDY'
  )
  -- Step 3: aggregate subgraph traversal per remedy
  SELECT
    gt.remedy AS remedy_name,
    COUNT(DISTINCT gt.rubric_name) AS matched_rubrics_count,
    SUM(gt.grade_weight) AS total_grading_score,
    array_agg(DISTINCT gt.rubric_name) AS matched_rubric_names,
    jsonb_agg(gt.path_info) AS relationship_paths
  FROM graph_traversal gt
  GROUP BY gt.remedy
  ORDER BY total_grading_score DESC, matched_rubrics_count DESC;
END;
$$;
