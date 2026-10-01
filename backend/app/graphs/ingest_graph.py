"""
Ingest Graph — File parsing + batch embedding → Postgres
Supports: PDF, DOCX, PPTX, TXT, MD, CSV, HTML, PNG, JPG, WEBP, MP3, WAV, M4A, OGG
"""
from pypdf import PdfReader
from docx import Document as DocxDoc
from psycopg.types.json import Json
from app.db.client import get_conn
from app.services.embed_local import chunk_text, embed_chunks_batch

IMAGE_EXTS = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
AUDIO_EXTS = {".mp3": "audio/mp3", ".wav": "audio/wav", ".m4a": "audio/mp4", ".ogg": "audio/ogg"}


def parse_file(path: str, ext: str) -> list[tuple[str, int]]:
    """Return list of (text, page_number) tuples."""
    ext = ext.lower()
    if ext in IMAGE_EXTS:
        try:
            from app.services.gemini_llm import describe_image
            data = open(path, "rb").read()
            return [(describe_image(data, IMAGE_EXTS[ext]), 0)]
        except Exception as e:
            return [(f"[Image ingestion failed: {e}]", 0)]

    if ext in AUDIO_EXTS:
        try:
            from app.services.gemini_llm import transcribe_audio
            data = open(path, "rb").read()
            return [(transcribe_audio(data, AUDIO_EXTS[ext]), 0)]
        except Exception as e:
            return [(f"[Audio ingestion failed: {e}]", 0)]

    if ext == ".pdf":
        r = PdfReader(path)
        return [((p.extract_text() or ""), i + 1) for i, p in enumerate(r.pages)]

    if ext == ".docx":
        d = DocxDoc(path)
        return [("\n".join(p.text for p in d.paragraphs), 0)]

    if ext in (".txt", ".md", ".csv"):
        return [(open(path, encoding="utf-8", errors="ignore").read(), 0)]

    if ext in (".html", ".htm"):
        import re
        html = open(path, encoding="utf-8", errors="ignore").read()
        return [(re.sub(r"<[^>]+>", " ", html), 0)]

    if ext == ".pptx":
        from pptx import Presentation
        prs = Presentation(path)
        txt = "\n".join(sh.text for s in prs.slides for sh in s.shapes if hasattr(sh, "text"))
        return [(txt, 0)]

    raise ValueError(
        f"Unsupported {ext}. Supported: pdf/docx/pptx/txt/md/csv/html "
        f"+ png/jpg/webp (Gemini vision) + mp3/wav/m4a/ogg (Gemini audio)"
    )


def ingest_file(filename: str, path: str, ext: str, doc_id: str | None = None) -> str:
    """
    Parse → chunk (sentence-aware) → batch-embed → store.
    If doc_id is provided (pre-created by router), updates that row.
    Otherwise creates a new document row.
    """
    pages = parse_file(path, ext)

    # Collect all chunks and metadata
    all_chunks: list[tuple[str, int]] = []   # (chunk_text, page)
    for text, page in pages:
        for ch in chunk_text(text):
            if ch.strip():
                all_chunks.append((ch, page))

    if not all_chunks:
        return doc_id or ""

    # Batch embed all chunks at once — far faster than one-by-one
    texts_only = [c[0] for c in all_chunks]
    embeddings = embed_chunks_batch(texts_only)

    with get_conn() as conn, conn.cursor() as cur:
        if doc_id is None:
            cur.execute(
                "INSERT INTO documents(filename, type, status) VALUES(%s,%s,'ready') RETURNING id::text",
                (filename, ext)
            )
            doc_id = cur.fetchone()[0]

        for idx, ((ch, page), emb) in enumerate(zip(all_chunks, embeddings)):
            cur.execute(
                "INSERT INTO chunks(doc_id, section, page, chunk_idx, content, embedding) "
                "VALUES(%s,%s,%s,%s,%s,%s)",
                (doc_id, "", page, idx, ch, Json(emb)),
            )
        conn.commit()

    return doc_id
