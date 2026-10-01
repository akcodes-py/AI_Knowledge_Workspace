from typing import TypedDict
from langgraph.graph import StateGraph, END
from app.services.retrieve_hybrid import hybrid_search
from app.services.embed_local import embed_texts
from app.services.gemini_llm import generate_answer

class RAGState(TypedDict):
    query: str
    doc_ids: list
    contexts: list
    answer: str

def rewrite(state: RAGState):
    return {"query": state["query"].strip()}

def retrieve(state: RAGState):
    # Embed once; k=6 (was 12) → faster DB query & less rerank overhead
    emb = embed_texts([state["query"]])[0]
    return {"contexts": hybrid_search(state["query"], emb, state.get("doc_ids"), k=6)}

def rerank_top(state: RAGState):
    # Simple fused-score sort (no cross-encoder download on hot path)
    contexts = sorted(state["contexts"], key=lambda x: x.get("fused", 0), reverse=True)[:4]
    return {"contexts": contexts}

def gen(state: RAGState):
    return {"answer": generate_answer(state["query"], state["contexts"])}

def build_rag_graph():
    g = StateGraph(RAGState)
    g.add_node("rewrite",    rewrite)
    g.add_node("retrieve",   retrieve)
    g.add_node("rerank_top", rerank_top)
    g.add_node("generate",   gen)
    g.set_entry_point("rewrite")
    g.add_edge("rewrite",    "retrieve")
    g.add_edge("retrieve",   "rerank_top")
    g.add_edge("rerank_top", "generate")
    g.add_edge("generate",   END)
    return g.compile()

rag_graph = build_rag_graph()
