import json
import math
from app.db.client import get_conn

def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a)) or 1
    nb = math.sqrt(sum(y * y for y in b)) or 1
    return dot / (na * nb)

def hybrid_search(query: str, query_emb: list[float], doc_ids: list[str] | None = None, k: int = 8):
    filt = "AND c.doc_id = ANY(%s)" if doc_ids else ""
    sql = f"""
      SELECT c.content, c.section, c.page, d.filename, c.doc_id, c.embedding,
             ts_rank(c.tsv, plainto_tsquery('english', %s)) AS bm
      FROM chunks c JOIN documents d ON d.id = c.doc_id
      WHERE (plainto_tsquery('english', %s) @@ c.tsv OR TRUE) {filt}
      ORDER BY bm DESC
      LIMIT %s
    """
    params: list = [query, query]
    if doc_ids:
        params.append(doc_ids)
    params.append(k * 4)
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    out = []
    for content, section, page, filename, doc_id, emb_json, bm in rows:
        try:
            emb = emb_json if isinstance(emb_json, list) else (json.loads(emb_json) if emb_json else None)
            vs = cosine(query_emb, emb) if emb else 0.0
        except Exception:
            vs = 0.0
        out.append(dict(content=content, section=section or "", page=page or 0,
                        filename=filename, doc_id=str(doc_id), vs=vs, bm=float(bm or 0)))
    for c in out:
        c["fused"] = 0.7 * c["vs"] + 0.3 * min(c["bm"], 1.0)
    return sorted(out, key=lambda x: x["fused"], reverse=True)[:k]
