"""
Chat Router — AI Assistant with history, streaming-feel, per-user sessions
POST /chat/send    — send message, get AI reply + store history
GET  /chat/history — retrieve conversation history for current session
DELETE /chat/history — clear session
"""
from fastapi import APIRouter, Depends, Query
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel
from app.routers.auth import optional_user
from app.db.client import get_conn
from app.graphs.rag_graph import rag_graph
from psycopg.types.json import Json
import uuid

router = APIRouter(prefix="/chat", tags=["chat"])

class ChatSendIn(BaseModel):
    query: str
    doc_ids: list[str] | None = None
    session_id: str = "default"

@router.post("/send")
async def chat_send(b: ChatSendIn, user=Depends(optional_user)):
    user_id = user["sub"] if user else None

    out = await run_in_threadpool(
        rag_graph.invoke,
        {"query": b.query, "doc_ids": b.doc_ids or [], "contexts": [], "answer": ""}
    )
    answer = out["answer"]
    citations = [
        {"file": c["filename"], "page": c["page"], "section": c["section"]}
        for c in out["contexts"]
    ]

    # Persist history
    if user_id:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "INSERT INTO chat_history(user_id, session_id, role, content) VALUES(%s,%s,%s,%s)",
                (user_id, b.session_id, "user", b.query)
            )
            cur.execute(
                "INSERT INTO chat_history(user_id, session_id, role, content, citations) VALUES(%s,%s,%s,%s,%s)",
                (user_id, b.session_id, "assistant", answer, Json(citations))
            )
            conn.commit()

    return {"answer": answer, "citations": citations}


@router.get("/history")
def chat_history(
    session_id: str = Query("default"),
    limit: int = Query(40),
    user=Depends(optional_user)
):
    if not user:
        return {"messages": []}
    user_id = user["sub"]
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT role, content, citations, created_at::text
            FROM chat_history
            WHERE user_id=%s AND session_id=%s
            ORDER BY created_at ASC
            LIMIT %s
        """, (user_id, session_id, limit))
        rows = cur.fetchall()
    return {"messages": [
        {"role": r[0], "content": r[1], "citations": r[2] or [], "created_at": r[3]}
        for r in rows
    ]}


@router.delete("/history")
def clear_history(session_id: str = Query("default"), user=Depends(optional_user)):
    if not user:
        return {"ok": True}
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM chat_history WHERE user_id=%s AND session_id=%s",
            (user["sub"], session_id)
        )
        conn.commit()
    return {"ok": True}


@router.get("/sessions")
def list_sessions(user=Depends(optional_user)):
    """Return all distinct session IDs for the user."""
    if not user:
        return {"sessions": []}
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT DISTINCT session_id, MAX(created_at)::text as last
            FROM chat_history WHERE user_id=%s
            GROUP BY session_id ORDER BY last DESC LIMIT 20
        """, (user["sub"],))
        rows = cur.fetchall()
    return {"sessions": [{"id": r[0], "last": r[1]} for r in rows]}
