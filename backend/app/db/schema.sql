-- AI Knowledge Workspace — Full Schema (with Users + Auth)
-- Run: psql -U postgres -d ai_workspace -f schema.sql

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (Google OAuth)
CREATE TABLE IF NOT EXISTS users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id   TEXT UNIQUE,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  last_login  TIMESTAMPTZ DEFAULT now()
);

-- Documents (per-user ownership)
CREATE TABLE IF NOT EXISTS documents (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  filename    TEXT NOT NULL,
  type        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'processing',  -- processing | ready | error
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Chunks (vector store w/ BM25 fallback)
CREATE TABLE IF NOT EXISTS chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id      UUID REFERENCES documents(id) ON DELETE CASCADE,
  section     TEXT DEFAULT '',
  page        INT DEFAULT 0,
  chunk_idx   INT NOT NULL,
  content     TEXT NOT NULL,
  tsv         TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  embedding   JSONB  -- JSONB for MVP; migrate to vector(384) with pgvector later
);

CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_chunks_tsv ON chunks USING GIN(tsv);
CREATE INDEX IF NOT EXISTS idx_docs_user  ON documents(user_id);

-- Chat history (per-user, per-session)
CREATE TABLE IF NOT EXISTS chat_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL DEFAULT 'default',
  role        TEXT NOT NULL,  -- user | assistant
  content     TEXT NOT NULL,
  citations   JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_user_session ON chat_history(user_id, session_id, created_at DESC);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  doc_ids     UUID[] NOT NULL,
  config      JSONB NOT NULL,
  items       JSONB NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Quiz attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  topic       TEXT NOT NULL,
  doc_ids     UUID[],
  score       FLOAT NOT NULL DEFAULT 0,
  total       INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Knowledge graphs
CREATE TABLE IF NOT EXISTS knowledge_graphs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  doc_ids     UUID[],
  nodes       JSONB,
  edges       JSONB,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Study plans
CREATE TABLE IF NOT EXISTS study_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  exam_date     DATE,
  hours_per_day FLOAT,
  syllabus      TEXT,
  plan          JSONB,
  created_at    TIMESTAMPTZ DEFAULT now()
);
