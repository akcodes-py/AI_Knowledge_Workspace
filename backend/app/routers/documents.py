"""
Documents Router — with user auth, background ingestion, status polling
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, BackgroundTasks
from app.routers.auth import optional_user, get_current_user
from app.db.client import get_conn
from app.graphs.ingest_graph import ingest_file
from app.graphs.code_graph import ingest_code_repo
from app.graphs.youtube_graph import index_youtube
from app.graphs.link_graph import index_link
from pydantic import BaseModel
import os, tempfile, uuid

router = APIRouter(prefix="/documents", tags=["documents"])


class YTIn(BaseModel):
    url: str

class LinkIn(BaseModel):
    url: str


def _do_ingest(doc_id: str, filename: str, path: str, ext: str):
    """Background task: do the actual chunking/embedding, then mark ready."""
    try:
        ingest_file(filename, path, ext, doc_id=doc_id)
        status = "ready"
    except Exception as e:
        print(f"[ingest] {filename} failed: {e}")
        status = "error"
    finally:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("UPDATE documents SET status=%s WHERE id=%s", (status, doc_id))
            conn.commit()
        try:
            os.unlink(path)
        except Exception:
            pass


def _do_ingest_code(doc_id: str, filename: str, path: str):
    try:
        ingest_code_repo(filename, path, doc_id=doc_id)
        status = "ready"
    except Exception as e:
        print(f"[ingest_code] {filename} failed: {e}")
        status = "error"
    finally:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("UPDATE documents SET status=%s WHERE id=%s", (status, doc_id))
            conn.commit()
        try:
            os.unlink(path)
        except Exception:
            pass


def _do_ingest_yt(doc_id: str, url: str):
    try:
        index_youtube(url, doc_id=doc_id)
        status = "ready"
    except Exception as e:
        print(f"[ingest_yt] {url} failed: {e}")
        status = "error"
    finally:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("UPDATE documents SET status=%s WHERE id=%s", (status, doc_id))
            conn.commit()


def _do_ingest_link(doc_id: str, url: str):
    try:
        index_link(url, doc_id=doc_id)
        status = "ready"
    except Exception as e:
        print(f"[ingest_link] {url} failed: {e}")
        status = "error"
    finally:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("UPDATE documents SET status=%s WHERE id=%s", (status, doc_id))
            conn.commit()


@router.get("/")
def list_docs(user=Depends(optional_user)):
    user_id = user["sub"] if user else None
    with get_conn() as conn, conn.cursor() as cur:
        if user_id:
            cur.execute("""
                SELECT id::text, filename, type, status, created_at::text
                FROM documents WHERE user_id=%s
                ORDER BY created_at DESC LIMIT 100
            """, (user_id,))
        else:
            cur.execute("""
                SELECT id::text, filename, type, status, created_at::text
                FROM documents WHERE user_id IS NULL
                ORDER BY created_at DESC LIMIT 100
            """)
        return [{"id": r[0], "filename": r[1], "type": r[2], "status": r[3], "created": r[4]} for r in cur.fetchall()]


@router.post("/upload-file")
async def upload_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user=Depends(optional_user)
):
    user_id = user["sub"] if user else None
    ext = os.path.splitext(file.filename)[1].lower()
    content = await file.read()
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as t:
        t.write(content)
        path = t.name

    # Create document row immediately with status=processing
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO documents(user_id, filename, type, status) VALUES(%s,%s,%s,'processing') RETURNING id::text",
            (user_id, file.filename, ext)
        )
        doc_id = cur.fetchone()[0]
        conn.commit()

    # Kick off background ingestion — returns instantly
    if ext == ".zip":
        background_tasks.add_task(_do_ingest_code, doc_id, file.filename, path)
    else:
        background_tasks.add_task(_do_ingest, doc_id, file.filename, path, ext)

    return {"doc_id": doc_id, "status": "processing", "message": f"Ingesting {file.filename} in background..."}


@router.post("/youtube")
async def youtube_index(b: YTIn, background_tasks: BackgroundTasks, user=Depends(optional_user)):
    user_id = user["sub"] if user else None
    vid = b.url.split("v=")[-1].split("&")[0].split("/")[-1]
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO documents(user_id, filename, type, status) VALUES(%s,%s,'youtube','processing') RETURNING id::text",
            (user_id, f"youtube:{vid}")
        )
        doc_id = cur.fetchone()[0]
        conn.commit()
    background_tasks.add_task(_do_ingest_yt, doc_id, b.url)
    return {"doc_id": doc_id, "status": "processing", "message": "YouTube transcript indexing in background..."}


@router.post("/link")
async def link_index(b: LinkIn, background_tasks: BackgroundTasks, user=Depends(optional_user)):
    user_id = user["sub"] if user else None
    clean_display = b.url.replace("https://", "").replace("http://", "")[:50]
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "INSERT INTO documents(user_id, filename, type, status) VALUES(%s,%s,'link','processing') RETURNING id::text",
            (user_id, clean_display)
        )
        doc_id = cur.fetchone()[0]
        conn.commit()
    background_tasks.add_task(_do_ingest_link, doc_id, b.url)
    return {"doc_id": doc_id, "status": "processing", "message": f"Web link {clean_display} indexing in background..."}


@router.get("/{doc_id}/status")
def doc_status(doc_id: str, user=Depends(optional_user)):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT status FROM documents WHERE id=%s", (doc_id,))
        row = cur.fetchone()
    if not row:
        raise HTTPException(404, "Document not found")
    return {"doc_id": doc_id, "status": row[0]}


@router.delete("/{doc_id}")
def delete_doc(doc_id: str, user=Depends(get_current_user)):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM documents WHERE id=%s AND (user_id=%s OR user_id IS NULL)",
            (doc_id, user["sub"])
        )
        conn.commit()
    return {"ok": True}
