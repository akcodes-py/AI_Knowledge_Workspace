"""
Embedding service — sentence-aware chunking + batch processing for speed
"""
import os
import re
_model = None

def get_model():
    global _model
    if _model is None:
        from sentence_transformers import SentenceTransformer
        _model = SentenceTransformer(
            os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2"),
            device="cpu",
        )
    return _model


def embed_texts(texts: list[str], batch_size: int = 64) -> list[list[float]]:
    """Batch encode for speed — returns normalised float vectors."""
    model = get_model()
    all_vecs = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        vecs = model.encode(batch, normalize_embeddings=True, show_progress_bar=False)
        all_vecs.extend(vecs.tolist())
    return all_vecs


def chunk_text(
    text: str,
    max_words: int = 300,       # smaller chunks → more precise retrieval
    overlap_words: int = 50,    # overlap preserves context at boundaries
) -> list[str]:
    """
    Sentence-aware chunking:
    1. Split into sentences using punctuation regex.
    2. Group sentences until max_words is reached.
    3. Overlap last N words into next chunk.
    """
    # Sentence splitter: split on .  !  ? followed by whitespace/end
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    chunks: list[str] = []
    current_words: list[str] = []
    current_count = 0

    for sent in sentences:
        words = sent.split()
        if not words:
            continue
        # If adding this sentence would exceed max_words, flush chunk first
        if current_count + len(words) > max_words and current_words:
            chunk = " ".join(current_words)
            if chunk.strip():
                chunks.append(chunk)
            # Carry over overlap
            current_words = current_words[-overlap_words:]
            current_count = len(current_words)
        current_words.extend(words)
        current_count += len(words)

    # Flush remaining
    if current_words:
        chunk = " ".join(current_words)
        if chunk.strip():
            chunks.append(chunk)

    return chunks or [text]   # fallback: return whole text as single chunk


def embed_chunks_batch(chunks: list[str]) -> list[list[float]]:
    """Embed all chunks at once — much faster than one-by-one."""
    if not chunks:
        return []
    return embed_texts(chunks)
