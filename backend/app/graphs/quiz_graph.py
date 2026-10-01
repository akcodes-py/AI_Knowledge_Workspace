from typing import TypedDict
from langgraph.graph import StateGraph, END
from app.services.retrieve_hybrid import hybrid_search
from app.services.embed_local import embed_texts
from app.services.gemini_llm import generate_json, GEMINI_API_KEY

class QuizState(TypedDict):
    topic: str
    doc_ids: list
    count: int
    difficulty: str
    qtypes: list
    items: list

def fetch_ctx(state: QuizState):
    emb = embed_texts([state["topic"]])[0]
    return {"_ctx": hybrid_search(state["topic"], emb, state.get("doc_ids"), k=6)}

def make_quiz(state: QuizState):
    ctx = state.pop("_ctx", [])
    n = state["count"]
    types = ",".join(state.get("qtypes") or ["MCQ"])
    if not GEMINI_API_KEY:
        items = [{"q": f"(stub) Q{i+1} [{t.strip()}] on {state['topic']} ({state['difficulty']})?",
                  "type": t.strip(), "options": ["A", "B", "C", "D"],
                  "answer": "A", "explanation": "Set GEMINI_API_KEY for real questions."}
                 for i in range(n) for t in [types.split(",")[i % len(types.split(","))]]]
        return {"items": items[:n]}
    prompt = (f"Create {n} questions on '{state['topic']}' difficulty {state['difficulty']} "
              f"using types {types} (MCQ=single correct, MSQ=multiple correct, TF=True/False). "
              f"Ground every question in context. Return JSON list of "
              f"{{q, type, options, answer, explanation}}.")
    items = generate_json(prompt, ctx, lambda: [{"q": "LLM parse failed", "type": "MCQ", "options": [], "answer": "", "explanation": ""}])
    return {"items": items if isinstance(items, list) else [items]}

def build_quiz_graph():
    g = StateGraph(QuizState)
    g.add_node("fetch", fetch_ctx)
    g.add_node("make", make_quiz)
    g.set_entry_point("fetch")
    g.add_edge("fetch", "make")
    g.add_edge("make", END)
    return g.compile()

quiz_graph = build_quiz_graph()
