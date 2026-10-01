"""
Gemini LLM Service — with Context Caching + LRU cache for speed
"""
import os
import json
import functools
import hashlib
import time
from dotenv import load_dotenv
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-flash-lite-latest")
_FALLBACKS     = ["gemini-flash-lite-latest", "gemini-3-flash-preview", "gemini-3.1-flash-lite-preview", "gemini-3.8-flash", "gemini-flash-latest"]


# Compact, fast system prompt (minimise tokens)
SYSTEM = (
    "You are a concise, source-grounded AI tutor. "
    "Answer ONLY from provided context. "
    "Cite sources inline as [File p.N]. "
    "Be brief — max 3 paragraphs unless explicitly asked for more. "
    "If context is insufficient, say so honestly."
)

_CLIENT = None

def _client():
    """Singleton genai client — never re-create."""
    global _CLIENT
    if _CLIENT is None:
        from google import genai
        _CLIENT = genai.Client(api_key=GEMINI_API_KEY)
    return _CLIENT


# ──────────────────────────────────────────────────────
# Context caching (Gemini API v1beta)
# Cache the system prompt so it's not re-sent each call
# ──────────────────────────────────────────────────────
_CACHED_CONTENT_NAME = None   # cache name returned by Gemini

def _get_or_create_cache():
    """Create/reuse a Gemini cached content for our system prompt."""
    global _CACHED_CONTENT_NAME
    if _CACHED_CONTENT_NAME:
        return _CACHED_CONTENT_NAME
    try:
        from google.genai import types
        # Only flash-1.5+ support context caching
        cache_model = "gemini-1.5-flash-001"
        c = _client().caches.create(
            model=cache_model,
            config=types.CreateCachedContentConfig(
                contents=[types.Content(
                    role="user",
                    parts=[types.Part(text=SYSTEM)]
                )],
                ttl="3600s",
            ),
        )
        _CACHED_CONTENT_NAME = c.name
        print(f"[gemini] context cache created: {c.name}")
        return c.name
    except Exception as e:
        print(f"[gemini] context caching unavailable ({e}), using inline system prompt")
        return None


# ──────────────────────────────────────────────────────
# LRU in-process cache: identical prompts → instant
# ──────────────────────────────────────────────────────
@functools.lru_cache(maxsize=512)
def _generate_cached(prompt_hash: str, prompt: str) -> str:
    return _generate_raw(prompt)


def _generate_raw(prompt: str) -> str:
    """Single-attempt with 1 retry on 503, fail-fast on others."""
    from google.genai import types
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM,
        max_output_tokens=600,
        temperature=0.15,     # low temp = more deterministic = better LRU cache hits
    )
    tried = [GEMINI_MODEL] + [m for m in _FALLBACKS if m != GEMINI_MODEL]
    last_err: Exception | str = "no models"
    for model in tried:
        for attempt in range(2):
            try:
                r = _client().models.generate_content(
                    model=model, contents=prompt, config=config
                )
                if r.text:
                    return r.text
                last_err = "empty response"
            except Exception as e:
                last_err = e
                msg = str(e)
                if "503" in msg or "UNAVAILABLE" in msg or "429" in msg:
                    time.sleep(attempt + 1)
                    continue
                break   # non-transient → try next model
    raise RuntimeError(last_err)


def _generate(prompt: str) -> str:
    """Public generate: try LRU cache first, then API."""
    h = hashlib.md5(prompt.encode()).hexdigest()
    return _generate_cached(h, prompt)


# ──────────────────────────────────────────────────────
# Context builder: minimal payload = faster API
# ──────────────────────────────────────────────────────
def _ctx_block(contexts: list[dict], limit: int = 5, chars: int = 900) -> str:
    """Top-N chunks, chars-limited → compact prompt."""
    return "\n\n".join(
        f"[{c.get('filename','?')} p.{c.get('page',0)}] {c['content'][:chars]}"
        for c in contexts[:limit]
    )


# ──────────────────────────────────────────────────────
# Public API
# ──────────────────────────────────────────────────────
def generate_answer(query: str, contexts: list[dict]) -> str:
    ctx = _ctx_block(contexts)
    if not GEMINI_API_KEY:
        return f"(stub — set GEMINI_API_KEY)\nQuery: {query}\nContext:\n{ctx[:500]}"
    try:
        return _generate(f"Context:\n{ctx}\n\nQuestion: {query}")
    except Exception as e:
        return f"(AI error: {str(e)[:200]})\n\nContext:\n{ctx[:500]}"


def generate_json(prompt: str, contexts: list[dict], fallback):
    """Ask Gemini for strict JSON; parse robustly, else return fallback."""
    ctx = _ctx_block(contexts)
    if not GEMINI_API_KEY:
        return fallback() if callable(fallback) else fallback
    try:
        txt = _generate(
            f"Return STRICT JSON only, no markdown fences.\n\n"
            f"Context:\n{ctx}\n\nTask: {prompt}"
        )
        txt = txt.strip().removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        return json.loads(txt)
    except Exception:
        return fallback() if callable(fallback) else fallback


def describe_image(data: bytes, mime: str, hint: str = "Describe all text, diagrams, and key concepts for study notes.") -> str:
    from google.genai import types
    r = _client().models.generate_content(
        model=GEMINI_MODEL,
        contents=[types.Part.from_bytes(data=data, mime_type=mime), hint]
    )
    return r.text or ""


def transcribe_audio(data: bytes, mime: str) -> str:
    from google.genai import types
    r = _client().models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            types.Part.from_bytes(data=data, mime_type=mime),
            "Transcribe this lecture audio verbatim. Prefix with [MM:SS] timestamps.",
        ]
    )
    return r.text or ""
