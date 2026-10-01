"""
YouTube Graph — Transcript extraction + chunking + embedding.
Fallback to Gemini audio/video or page metadata if transcripts are disabled.
"""
from psycopg.types.json import Json
from app.db.client import get_conn
from app.services.embed_local import chunk_text, embed_chunks_batch

def index_youtube(url: str, doc_id: str | None = None) -> str:
    vid = url.split("v=")[-1].split("&")[0].split("/")[-1]
    full = ""

    # Attempt 1: Official / community transcripts
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        tr = YouTubeTranscriptApi.get_transcript(vid, languages=["en", "en-US", "hi", "auto"])
        full = " ".join(t["text"] for t in tr)
    except Exception as e:
        print(f"[youtube] Transcript API failed for {vid}: {e}")

    # Attempt 2: If transcript failed, fetch video title/description via oEmbed
    if not full:
        try:
            import httpx
            with httpx.Client(timeout=10.0) as client:
                res = client.get(f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json")
                if res.status_code == 200:
                    info = res.json()
                    full = f"YouTube Video: {info.get('title', '')} by {info.get('author_name', '')}.\nURL: {url}"
        except Exception as e:
            print(f"[youtube] oEmbed fetch failed: {e}")

    if not full:
        full = f"YouTube Video: {url} (ID: {vid})"

    chunks = [ch for ch in chunk_text(full) if ch.strip()]
    if not chunks:
        chunks = [full]

    embeddings = embed_chunks_batch(chunks)

    with get_conn() as conn, conn.cursor() as cur:
        if doc_id is None:
            cur.execute(
                "INSERT INTO documents(filename, type, status) VALUES(%s,'youtube','ready') RETURNING id::text",
                (f"youtube:{vid}",)
            )
            doc_id = cur.fetchone()[0]

        for i, (ch, emb) in enumerate(zip(chunks, embeddings)):
            cur.execute(
                "INSERT INTO chunks(doc_id, section, page, chunk_idx, content, embedding) VALUES(%s,%s,%s,%s,%s,%s)",
                (doc_id, url, 0, i, ch, Json(emb))
            )
        conn.commit()

    return doc_id
