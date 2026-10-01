"""
Database migration script to safely bring existing tables up to date
with new users, user_id columns, and indexes.
"""
from app.db.client import get_conn, close_pool

def run_migration():
    with get_conn() as conn:
        with conn.cursor() as cur:
            # 1. Extensions
            cur.execute('CREATE EXTENSION IF NOT EXISTS pg_trgm;')
            cur.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto";')

            # 2. Users table
            cur.execute('''
                CREATE TABLE IF NOT EXISTS users (
                  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  google_id   TEXT UNIQUE,
                  email       TEXT UNIQUE NOT NULL,
                  name        TEXT NOT NULL DEFAULT '',
                  avatar_url  TEXT,
                  created_at  TIMESTAMPTZ DEFAULT now(),
                  last_login  TIMESTAMPTZ DEFAULT now()
                );
            ''')

            # 3. Documents table alterations
            cur.execute('''
                CREATE TABLE IF NOT EXISTS documents (
                  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  filename    TEXT NOT NULL,
                  type        TEXT NOT NULL,
                  created_at  TIMESTAMPTZ DEFAULT now()
                );
            ''')
            cur.execute('ALTER TABLE documents ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;')
            cur.execute("ALTER TABLE documents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready';")
            cur.execute('CREATE INDEX IF NOT EXISTS idx_docs_user ON documents(user_id);')

            # 4. Chunks table alterations
            cur.execute('''
                CREATE TABLE IF NOT EXISTS chunks (
                  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  doc_id      UUID REFERENCES documents(id) ON DELETE CASCADE,
                  section     TEXT DEFAULT '',
                  page        INT DEFAULT 0,
                  chunk_idx   INT NOT NULL,
                  content     TEXT NOT NULL,
                  tsv         TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
                  embedding   JSONB
                );
            ''')
            cur.execute('CREATE INDEX IF NOT EXISTS idx_chunks_doc ON chunks(doc_id);')
            cur.execute('CREATE INDEX IF NOT EXISTS idx_chunks_tsv ON chunks USING GIN(tsv);')

            # 5. Chat history
            cur.execute('''
                CREATE TABLE IF NOT EXISTS chat_history (
                  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  session_id  TEXT NOT NULL DEFAULT 'default',
                  role        TEXT NOT NULL,
                  content     TEXT NOT NULL,
                  citations   JSONB,
                  created_at  TIMESTAMPTZ DEFAULT now()
                );
            ''')
            cur.execute('ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;')
            cur.execute("ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS session_id TEXT NOT NULL DEFAULT 'default';")
            cur.execute("ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';")
            cur.execute("ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '';")
            cur.execute("ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS citations JSONB;")
            cur.execute("ALTER TABLE chat_history ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();")
            cur.execute('CREATE INDEX IF NOT EXISTS idx_chat_user_session ON chat_history(user_id, session_id, created_at DESC);')

            # 6. Other tables alterations (quizzes, attempts, kg, study plans)
            cur.execute('''
                CREATE TABLE IF NOT EXISTS quizzes (
                  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  doc_ids     UUID[] NOT NULL,
                  config      JSONB NOT NULL,
                  items       JSONB NOT NULL,
                  created_at  TIMESTAMPTZ DEFAULT now()
                );
            ''')
            cur.execute('ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;')

            cur.execute('''
                CREATE TABLE IF NOT EXISTS quiz_attempts (
                  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  topic       TEXT NOT NULL,
                  doc_ids     UUID[],
                  score       FLOAT NOT NULL DEFAULT 0,
                  total       INT NOT NULL DEFAULT 1,
                  created_at  TIMESTAMPTZ DEFAULT now()
                );
            ''')
            cur.execute('ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;')

            cur.execute('''
                CREATE TABLE IF NOT EXISTS knowledge_graphs (
                  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  doc_ids     UUID[],
                  nodes       JSONB,
                  edges       JSONB,
                  created_at  TIMESTAMPTZ DEFAULT now()
                );
            ''')
            cur.execute('ALTER TABLE knowledge_graphs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;')

            cur.execute('''
                CREATE TABLE IF NOT EXISTS study_plans (
                  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                  exam_date     DATE,
                  hours_per_day FLOAT,
                  syllabus      TEXT,
                  plan          JSONB,
                  created_at    TIMESTAMPTZ DEFAULT now()
                );
            ''')
            cur.execute('ALTER TABLE study_plans ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;')

            conn.commit()
            print("Migration successful! All tables, columns, and indexes are in place.")

if __name__ == "__main__":
    try:
        run_migration()
    finally:
        close_pool()
