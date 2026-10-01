# AI Knowledge & Learning Workspace — Build Plan
Source spec: `Downloads/AI_Knowledge_Learning_Workspace.md` (26 sections)

> Upload anything → Understand everything → Ask anything → Learn, create, visualize.

## 0. Locked decisions
- Scope: **Full feature set (all 12 user capabilities, spec §1 + §25 Phases 1-6)**
- Frontend: **Next.js 15 + TypeScript 5** (`/`, `/learn`, `/analyze`, `/practice`)
- Backend: **FastAPI + LangGraph + Gemini API** (`gemini-2.0-flash` via `google-genai` SDK)
- Embeddings: local `sentence-transformers` (Gemini embeddings optional later) — 384d
- DB: **Postgres 18** (JSONB embeddings + tsv hybrid; pgvector ext unavailable on Windows, migrate later)
- Ports: backend `:8001`, frontend `:3000`
- 21 API routes: health, documents, chat, quiz, summarize, flashcards, paper, compare, contradictions, research, graph, diagram, animation, planner, attempt, youtube

## 1. Architecture
```
Next.js → FastAPI routers (thin) → LangGraph graphs → services → Postgres+pgvector
                                     ├─ rag_graph: rewrite→hybrid_retrieve→rerank→expand→generate(Groq)+cite
                                     ├─ ingest_graph: parse→hier_chunk→embed→upsert
                                     ├─ quiz_graph: retrieve→generate→verify→answer-key
                                     └─ youtube_graph: transcript→segment→index→RAG
```

## 2. Phases (from spec §25)
- [x] P0 scaffold (this folder, plan.md, backend/frontend skeleton, DB schema)
- [ ] P1 MVP: PDF/DOCX/TXT parse → 600tok/100 overlap chunk → embed → pgvector → RAG chat + citations
- [ ] P2 Advanced RAG: hybrid (vector+FTS fusion) + cross-encoder rerank + hierarchical + query-rewrite + context-expansion
- [ ] P3 Multimodal: PPTX, OCR (tesseract), images, YouTube transcript, audio (whisper)
- [ ] P4 Learning: summary/notes levels, flashcards, MCQ/MSQ/T-F, question-paper, planner, adaptive loop
- [ ] P5 Generation: SVG/Canvas diagrams, mindmaps, animation storyboard
- [ ] P6 Intel: knowledge-graph, multi-doc compare, contradiction, research, code intel
- [ ] P7 Prod: auth, workspaces, Celery/Redis jobs, caching, observability, Docker, CI/CD

## 3. DB schema (Postgres+pgvector)
```sql
CREATE EXTENSION IF NOT EXISTS vector;
documents(id UUID PK, filename TEXT, type TEXT, created_at TIMESTAMPTZ)
chunks(id UUID PK, doc_id FK, section TEXT, chunk_idx INT, content TEXT, tsv TSVECTOR, embedding vector(384))
quizzes(id UUID PK, doc_ids UUID[], config JSONB, items JSONB, created_at TIMESTAMPTZ)
chat_history(id UUID PK, session TEXT, role TEXT, content TEXT, citations JSONB, created_at TIMESTAMPTZ)
```
Indexes: `ivfflat (embedding vector_cosine_ops)`, `GIN(tsv)`.

## 4. API contracts
- `POST /documents/upload` → {doc_id}
- `POST /chat/` {query, doc_ids[], filters} → SSE {tokens, citations[{file,page,section}]}
- `POST /quiz/` {doc_ids, count, types, difficulty} → {items, answer_key}
- `POST /notes/summarize` {doc_ids, level} → {markdown}
- `POST /youtube/index` {url} → {doc_id}

## 5. Next steps
1. `SET GROQ_API_KEY` in `backend/.env` (get at console.groq.com)
2. `pip install -r backend/requirements.txt`
3. `psql -f backend/app/db/schema.sql`
4. `uvicorn app.main:app --port 8001` + `npm run dev` in frontend
5. Test: upload PDF → chat → verify citations

## 6. Risks
- Groq key missing → graphs fall back to stub answers (see groq_llm.py)
- pgvector extension missing → run `CREATE EXTENSION vector` manually
- No Docker → Celery/Redis deferred to P7, use FastAPI BackgroundTasks for MVP
