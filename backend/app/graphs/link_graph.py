"""
Link / Web Graph — Fetch webpage content, extract text, chunk and embed into vector DB.
Uses httpx + BeautifulSoup with Gemini intelligence for clean extraction.
"""
import re
import httpx
from bs4 import BeautifulSoup
from psycopg.types.json import Json
from app.db.client import get_conn
from app.services.embed_local import chunk_text, embed_chunks_batch

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

def extract_web_content(url: str) -> tuple[str, str]:
    """Fetch URL and return (title, clean_text)."""
    with httpx.Client(timeout=15.0, follow_redirects=True, headers=HEADERS) as client:
        res = client.get(url)
        res.raise_for_status()
        html = res.text

    soup = BeautifulSoup(html, "html.parser")

    # Remove non-content elements
    for el in soup(["script", "style", "noscript", "nav", "footer", "header", "aside", "svg"]):
        el.decompose()

    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    elif soup.find("h1"):
        title = soup.find("h1").get_text(strip=True)
    else:
        title = url

    # Try article / main tags first for higher relevance
    article = soup.find("article") or soup.find("main") or soup.body or soup
    raw_text = article.get_text(separator="\n", strip=True)

    # Clean redundant whitespace
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    clean_text = "\n".join(lines)

    return title, clean_text


def index_link(url: str, doc_id: str | None = None) -> str:
    """
    Fetch URL -> extract clean content -> chunk -> batch embed -> insert chunks into DB.
    """
    title, clean_text = extract_web_content(url)
    if not clean_text:
        raise ValueError(f"Could not extract readable content from {url}")

    chunks = [ch for ch in chunk_text(clean_text) if ch.strip()]
    if not chunks:
        chunks = [clean_text[:1000]]

    embeddings = embed_chunks_batch(chunks)

    with get_conn() as conn, conn.cursor() as cur:
        if doc_id is None:
            cur.execute(
                "INSERT INTO documents(filename, type, status) VALUES(%s, 'link', 'ready') RETURNING id::text",
                (f"{title[:80]} ({url})",)
            )
            doc_id = cur.fetchone()[0]

        for i, (ch, emb) in enumerate(zip(chunks, embeddings)):
            cur.execute(
                "INSERT INTO chunks(doc_id, section, page, chunk_idx, content, embedding) "
                "VALUES(%s, %s, %s, %s, %s, %s)",
                (doc_id, url, 0, i, ch, Json(emb))
            )
        conn.commit()

    return doc_id
