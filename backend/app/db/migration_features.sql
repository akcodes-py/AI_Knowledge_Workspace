CREATE TABLE IF NOT EXISTS quiz_attempts(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  doc_ids UUID[],
  score FLOAT NOT NULL,
  total INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS study_plans(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_date DATE,
  hours_per_day FLOAT,
  syllabus TEXT,
  plan JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS knowledge_graphs(
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_ids UUID[],
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
