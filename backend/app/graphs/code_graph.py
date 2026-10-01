"""
Code Repo Graph — ZIP extraction + batch embedding for code files
"""
import os
import zipfile
import tempfile
from app.db.client import get_conn
from app.services.embed_local import chunk_text, embed_chunks_batch
from psycopg.types.json import Json

CODE_EXTS = {".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".c", ".cpp", ".go", ".rs", ".md", ".txt", ".sql"}


def ingest_code_repo(name: str, zip_path: str, doc_id: str | None = None) -> str:
    tmp = tempfile.mkdtemp()
    with zipfile.ZipFile(zip_path) as z:
        z.extractall(tmp)

    # Collect all code texts with metadata
    all_chunks: list[tuple[str, str]] = []  # (chunk_text, rel_path)
    for root, _, fns in os.walk(tmp):
        for f in fns:
            if os.path.splitext(f)[1].lower() in CODE_EXTS:
                fp = os.path.join(root, f)
                try:
                    text = open(fp, encoding="utf-8", errors="ignore").read()[:10000]
                except Exception:
                    continue
                rel = os.path.relpath(fp, tmp)
                for ch in chunk_text(f"FILE: {rel}\n{text}"):
                    all_chunks.append((ch, rel))
                if len(all_chunks) > 3000:  # safety cap
                    break
        if len(all_chunks) > 3000:
            break

    if not all_chunks:
        return doc_id or ""

    # Batch embed all at once
    texts_only = [c[0] for c in all_chunks]
    embeddings = embed_chunks_batch(texts_only)

    with get_conn() as conn, conn.cursor() as cur:
        if doc_id is None:
            cur.execute(
                "INSERT INTO documents(filename, type, status) VALUES(%s,'code','ready') RETURNING id::text",
                (name,)
            )
            doc_id = cur.fetchone()[0]

        for idx, ((ch, rel), emb) in enumerate(zip(all_chunks, embeddings)):
            cur.execute(
                "INSERT INTO chunks(doc_id, section, page, chunk_idx, content, embedding) VALUES(%s,%s,%s,%s,%s,%s)",
                (doc_id, rel, 0, idx, ch, Json(emb)),
            )
        conn.commit()

    return doc_id
