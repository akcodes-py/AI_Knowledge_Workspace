"""Notes, flashcards, study material, diagrams, animation storyboards, research, compare, contradictions."""
from app.services.retrieve_hybrid import hybrid_search
from app.services.embed_local import embed_texts
from app.services.gemini_llm import generate_answer, generate_json

def ctx_for(topic: str, doc_ids, k: int = 6):
    return hybrid_search(topic, embed_texts([topic])[0], doc_ids, k=k)

def summarize(topic: str, doc_ids, level: str = "exam") -> str:
    return generate_answer(f"Write a {level}-level structured summary of '{topic}': key points, definitions, examples, revision bullets.", ctx_for(topic, doc_ids))

def flashcards(topic: str, doc_ids, count: int = 12):
    return generate_json(
        f"Make {count} flashcards on '{topic}' as JSON list of {{front, back}}.",
        ctx_for(topic, doc_ids),
        lambda: [{"front": f"(stub) Card {i+1}: {topic}", "back": "Set GEMINI_API_KEY"} for i in range(count)])

def question_paper(subject: str, doc_ids, spec: dict):
    n_mcq, n_msq, n_num = spec.get("mcq", 5), spec.get("msq", 3), spec.get("num", 2)
    prompt = (f"Build an exam paper for '{subject}' difficulty {spec.get('difficulty','medium')} "
              f"duration {spec.get('duration','1 hour')}: {n_mcq} MCQ, {n_msq} MSQ, {n_num} numerical. "
              f"Balance topics, avoid duplicates, include answer key with explanations. "
              f"Return JSON {{sections, answer_key}}.")
    return generate_json(prompt, ctx_for(subject, doc_ids, k=10),
                         lambda: {"sections": [], "answer_key": []})

def compare(topic: str, doc_ids) -> str:
    return generate_answer(f"Compare how the sources explain '{topic}': common concepts, differences, which source covers what best. Use a table.", ctx_for(topic, doc_ids, k=10))

def contradictions(topic: str, doc_ids):
    return generate_json(
        f"Find contradictions between sources about '{topic}'. Return JSON list of {{claim_a, source_a, claim_b, source_b, verdict}}.",
        ctx_for(topic, doc_ids, k=10), lambda: [])

def research_summary(topic: str, doc_ids):
    return generate_json(
        f"For research topic '{topic}' extract JSON {{summary, methods, datasets, results, comparison_table, timeline}}.",
        ctx_for(topic, doc_ids, k=10),
        lambda: {"summary": "Set GEMINI_API_KEY", "methods": [], "datasets": [], "results": [], "comparison_table": [], "timeline": []})

def knowledge_graph(topic: str, doc_ids):
    return generate_json(
        f"Extract a knowledge graph for '{topic}' as JSON {{nodes:[{{id,label}}], edges:[{{from,to,label}}]}}. Max 20 nodes.",
        ctx_for(topic, doc_ids, k=10), lambda: {"nodes": [], "edges": []})

def diagram_mermaid(topic: str, doc_ids, kind: str = "flowchart") -> str:
    return generate_answer(f"Create a {kind} diagram for '{topic}' as a Mermaid code block only (```mermaid ... ```).", ctx_for(topic, doc_ids))

def animation_storyboard(concept: str, doc_ids, mode: str = "concept"):
    return generate_json(
        f"Create an educational animation storyboard ({mode} mode) for '{concept}': "
        f"JSON {{title, narration, scenes:[{{caption, svg_shapes, duration_s}}]}}. "
        f"svg_shapes: simple deterministic shapes (rect/circle/arrow/text with x,y,label). 4-6 scenes.",
        ctx_for(concept, doc_ids, k=8),
        lambda: {"title": concept, "narration": "", "scenes": []})

def study_plan(syllabus: str, exam_date: str, hours: float, weak_topics: list[str]):
    prompt = (f"Create a study plan as JSON {{days:[{{date, topics, tasks, minutes}}]}}. "
              f"Syllabus: {syllabus}. Exam: {exam_date}. Hours/day: {hours}. "
              f"Prioritize weak topics: {weak_topics}.")
    return generate_json(prompt, [], lambda: {"days": []})
