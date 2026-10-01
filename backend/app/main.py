"""
Main FastAPI application — AI Knowledge Workspace
Full stack: Auth + RAG + Chat + Notes + Quiz + YouTube + Code
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from app.graphs.rag_graph import rag_graph
from app.graphs.quiz_graph import quiz_graph
from app.graphs import learn_graph as L
from app.db.client import get_conn
from app.routers import auth as auth_router
from app.routers import chat as chat_router
from app.routers import documents as docs_router
import os, threading

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm embedding model in background so first request isn't slow
    def _warm():
        try:
            from app.services.embed_local import embed_texts
            embed_texts(["warmup"])
            print("[warmup] embedding model ready")
        except Exception as e:
            print(f"[warmup] failed: {e}")
    threading.Thread(target=_warm, daemon=True).start()
    yield
    from app.db.client import close_pool
    close_pool()


app = FastAPI(title="AI Knowledge Workspace", version="2.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Include routers ────────────────────────────────────
app.include_router(auth_router.router)
app.include_router(chat_router.router)
app.include_router(docs_router.router)


# ── Pydantic models ───────────────────────────────────
class ChatIn(BaseModel):
    query: str
    doc_ids: list[str] | None = None

class QuizIn(BaseModel):
    topic: str = "document"
    doc_ids: list[str] | None = None
    count: int = 5
    difficulty: str = "medium"
    qtypes: list[str] | None = None

class NotesIn(BaseModel):
    doc_ids: list[str] | None = None
    level: str = "exam"
    topic: str = "Summarize key points"

class CardsIn(BaseModel):
    topic: str
    doc_ids: list[str] | None = None
    count: int = 12

class PaperIn(BaseModel):
    subject: str
    doc_ids: list[str] | None = None
    mcq: int = 5; msq: int = 3; num: int = 2
    difficulty: str = "medium"; duration: str = "1 hour"

class TopicDocs(BaseModel):
    topic: str
    doc_ids: list[str] | None = None

class AnimIn(BaseModel):
    concept: str
    doc_ids: list[str] | None = None
    mode: str = "concept"

class PlanIn(BaseModel):
    syllabus: str
    exam_date: str = ""
    hours_per_day: float = 2.0

class AttemptIn(BaseModel):
    topic: str
    doc_ids: list[str] | None = None
    score: float = 0
    total: int = 1


# ── Health ────────────────────────────────────────────
@app.get("/health")
def health():
    return {"ok": True, "llm": "gemini-2.0-flash", "version": "2.0"}


# ── Legacy chat (kept for backward compat) ────────────
@app.post("/chat/")
async def chat_legacy(b: ChatIn):
    out = await run_in_threadpool(
        rag_graph.invoke,
        {"query": b.query, "doc_ids": b.doc_ids or [], "contexts": [], "answer": ""}
    )
    return {
        "answer": out["answer"],
        "citations": [
            {"file": c["filename"], "page": c["page"], "section": c["section"]}
            for c in out["contexts"]
        ]
    }


# ── Quiz ──────────────────────────────────────────────
@app.post("/quiz/")
def quiz(b: QuizIn):
    out = quiz_graph.invoke({
        "topic": b.topic, "doc_ids": b.doc_ids or [], "count": b.count,
        "difficulty": b.difficulty, "qtypes": b.qtypes or ["MCQ"], "items": []
    })
    return {"items": out["items"]}


# ── Notes / Learn ─────────────────────────────────────
@app.post("/notes/summarize")
def notes(b: NotesIn):
    return {"markdown": L.summarize(b.topic, b.doc_ids or [], b.level)}

@app.post("/notes/flashcards")
def cards(b: CardsIn):
    return {"cards": L.flashcards(b.topic, b.doc_ids or [], b.count)}

@app.post("/notes/paper")
def paper(b: PaperIn):
    return L.question_paper(b.subject, b.doc_ids or [], b.model_dump())

@app.post("/notes/compare")
def compare(b: TopicDocs):
    return {"markdown": L.compare(b.topic, b.doc_ids or [])}

@app.post("/notes/contradictions")
def contra(b: TopicDocs):
    return {"items": L.contradictions(b.topic, b.doc_ids or [])}

@app.post("/notes/research")
def research(b: TopicDocs):
    return L.research_summary(b.topic, b.doc_ids or [])

@app.post("/notes/graph")
def kg(b: TopicDocs):
    g = L.knowledge_graph(b.topic, b.doc_ids or [])
    with get_conn() as c, c.cursor() as cur:
        from psycopg.types.json import Json
        cur.execute(
            "INSERT INTO knowledge_graphs(doc_ids,nodes,edges) VALUES(%s,%s,%s) RETURNING id::text",
            (b.doc_ids or [], Json(g.get("nodes", [])), Json(g.get("edges", [])))
        )
        gid = cur.fetchone()[0]; c.commit()
    return {**g, "graph_id": gid}

@app.post("/notes/diagram")
def diagram(b: TopicDocs, kind: str = "flowchart"):
    return {"mermaid": L.diagram_mermaid(b.topic, b.doc_ids or [], kind)}

@app.post("/notes/animation")
def anim(b: AnimIn):
    return L.animation_storyboard(b.concept, b.doc_ids or [], b.mode)

@app.post("/notes/planner")
def planner(b: PlanIn):
    with get_conn() as c, c.cursor() as cur:
        cur.execute("SELECT topic, AVG(score*1.0/NULLIF(total,0)) FROM quiz_attempts GROUP BY topic")
        weak = [r[0] for r in cur.fetchall() if (r[1] or 1) < 0.7]
    plan = L.study_plan(b.syllabus, b.exam_date, b.hours_per_day, weak)
    with get_conn() as c, c.cursor() as cur:
        from psycopg.types.json import Json
        import datetime
        try:
            ed = datetime.date.fromisoformat(b.exam_date) if b.exam_date else None
        except Exception:
            ed = None
        cur.execute(
            "INSERT INTO study_plans(exam_date,hours_per_day,syllabus,plan) VALUES(%s,%s,%s,%s) RETURNING id::text",
            (ed, b.hours_per_day, b.syllabus, Json(plan))
        )
        pid = cur.fetchone()[0]; c.commit()
    return {**plan, "plan_id": pid, "weak_topics": weak}


# ── Quiz attempt ──────────────────────────────────────
@app.post("/quiz/attempt")
def attempt(b: AttemptIn):
    with get_conn() as c, c.cursor() as cur:
        cur.execute(
            "INSERT INTO quiz_attempts(topic,doc_ids,score,total) VALUES(%s,%s,%s,%s)",
            (b.topic, b.doc_ids or [], b.score, b.total)
        )
        c.commit()
        cur.execute(
            "SELECT topic, ROUND(AVG(score*100.0/NULLIF(total,0)),1), COUNT(*) FROM quiz_attempts GROUP BY topic"
        )
        perf = [{"topic": r[0], "avg_pct": float(r[1] or 0), "attempts": r[2]} for r in cur.fetchall()]
    weak = [p["topic"] for p in perf if p["avg_pct"] < 70]
    follow = None
    if weak:
        follow = {
            "message": f"Weak: {weak[0]}. Path: explain → example → animation → practice → re-test.",
            "remedy_notes": L.summarize(f"{weak[0]} basics with examples", b.doc_ids or [], "beginner"),
        }
    return {"performance": perf, "weak_topics": weak, "follow_up": follow}


# ── Legacy YouTube (kept for compat) ──────────────────
@app.post("/youtube/index")
def yt_legacy(b: dict):
    from app.graphs.youtube_graph import index_youtube
    return {"doc_id": index_youtube(b.get("url", ""))}

@app.post("/link/index")
def link_legacy(b: dict):
    from app.graphs.link_graph import index_link
    return {"doc_id": index_link(b.get("url", ""))}
