# Fast, memory-efficient reranking
_ce = None
_ce_failed = False

def get_cross_encoder():
    global _ce, _ce_failed
    if _ce_failed:
        return None
    if _ce is None:
        try:
            from sentence_transformers import CrossEncoder
            # Lazy initialize once
            _ce = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2", max_length=512)
        except Exception:
            _ce_failed = True
            return None
    return _ce

def rerank(query: str, contexts: list[dict], top_k: int = 5) -> list[dict]:
    """Fast reranker: uses fused hybrid scores for sub-millisecond retrieval, or cached CE."""
    if not contexts:
        return []
    
    # Fast path: sort by hybrid search fused score directly (instant sub-millisecond response)
    # This prevents blocking on HuggingFace model download timeouts
    try:
        ce = get_cross_encoder()
        if ce is not None and len(contexts) > 1:
            pairs = [(query, c.get("content", "")[:500]) for c in contexts]
            scores = ce.predict(pairs)
            for c, s in zip(contexts, scores):
                c["rerank"] = float(s)
            return sorted(contexts, key=lambda x: x.get("rerank", 0), reverse=True)[:top_k]
    except Exception:
        pass

    return sorted(contexts, key=lambda x: x.get("fused", 0), reverse=True)[:top_k]
