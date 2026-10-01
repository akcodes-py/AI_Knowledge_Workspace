"use client";
import { useState } from "react";
import Sidebar from "../Sidebar";
import UserMenu from "../UserMenu";
import ThemeToggle from "../ThemeToggle";

async function postApi(path: string, body: any) {
  const r = await fetch(`/api${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json();
}

interface Flashcard { front: string; back: string; }

type Tab = "summary" | "flashcards" | "paper" | "diagram" | "animation";

export default function Learn() {
  const [topic, setTopic] = useState("paging");
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [loading, setLoading] = useState(false);

  // Per-tab state
  const [summary, setSummary] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [flipped, setFlipped] = useState<Set<number>>(new Set());
  const [paper, setPaper] = useState<any>(null);
  const [diagram, setDiagram] = useState("");
  const [animation, setAnimation] = useState<any>(null);

  async function run() {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      if (activeTab === "summary") {
        const j = await postApi("/notes/summarize", { topic, level: "exam" });
        setSummary(j.markdown || "");
      } else if (activeTab === "flashcards") {
        const j = await postApi("/notes/flashcards", { topic, count: 8 });
        const raw = j.cards || [];
        setCards(
          Array.isArray(raw)
            ? raw.map((c: any) =>
                typeof c === "string"
                  ? { front: c, back: "" }
                  : { front: c.front || c.question || c.term || String(c), back: c.back || c.answer || c.definition || "" }
              )
            : []
        );
        setFlipped(new Set());
      } else if (activeTab === "paper") {
        const j = await postApi("/notes/paper", { subject: topic, mcq: 5, msq: 3, num: 2 });
        setPaper(j);
      } else if (activeTab === "diagram") {
        const j = await postApi("/notes/diagram", { topic });
        setDiagram(j.mermaid || "");
      } else if (activeTab === "animation") {
        const j = await postApi("/notes/animation", { concept: topic });
        setAnimation(j);
      }
    } catch {
      setSummary("⚠️ Error reaching backend.");
    } finally {
      setLoading(false);
    }
  }

  function toggleFlip(i: number) {
    setFlipped((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: "summary", icon: "📝", label: "Summary" },
    { id: "flashcards", icon: "🃏", label: "Flashcards" },
    { id: "paper", icon: "📋", label: "Question Paper" },
    { id: "diagram", icon: "🗺️", label: "Diagram" },
    { id: "animation", icon: "🎬", label: "Animation Storyboard" },
  ];

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="page-title">📚 Learn & Notes</h1>
            <p className="page-subtitle">Transform your knowledge into structured summaries, flashcards, and exam papers.</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* Topic input */}
        <div className="glass-card mb-6">
          <div className="section-title">🔎 Topic / Subject</div>
          <div className="flex gap-2">
            <input
              className="neu-input"
              placeholder="e.g. Virtual Memory, Neural Networks, Photosynthesis..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
            <button className="btn btn-primary" onClick={run} disabled={loading}>
              {loading ? "Generating..." : "Generate ✨"}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-6 border-b border-gray-700 pb-2 flex-wrap">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`btn btn-sm ${activeTab === t.id ? "btn-primary" : "btn-ghost"}`}
              onClick={() => setActiveTab(t.id)}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "summary" && (
          <div className="neu-card">
            <div className="section-title">📝 Summary / Notes</div>
            {summary ? (
              <div className="output-box" style={{ fontFamily: "var(--font-sans)", whiteSpace: "pre-wrap" }}>
                {summary}
              </div>
            ) : (
              <div className="output-box">
                <span className="output-placeholder">Generated summary will appear here. Enter a topic and click Generate.</span>
              </div>
            )}
          </div>
        )}

        {activeTab === "flashcards" && (
          <div className="neu-card">
            <div className="flex items-center justify-between mb-4" style={{ flexWrap: "wrap", gap: "var(--space-3)" }}>
              <div className="section-title" style={{ marginBottom: 0 }}>🃏 Flashcards</div>
              {cards.length > 0 && (
                <span className="badge badge-teal">{cards.length} cards · click to flip</span>
              )}
            </div>
            {cards.length > 0 ? (
              <div className="flashcard-grid">
                {cards.map((c, i) => (
                  <div
                    key={i}
                    className={`flashcard${flipped.has(i) ? " flipped" : ""}`}
                    onClick={() => toggleFlip(i)}
                  >
                    <div className="flashcard-num">#{i + 1}</div>
                    <div className="flashcard-front">{c.front}</div>
                    {flipped.has(i) && c.back && (
                      <div className="flashcard-back">{c.back}</div>
                    )}
                    {!flipped.has(i) && (
                      <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "var(--space-2)" }}>
                        👆 Tap to reveal answer
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="output-box">
                <span className="output-placeholder">Flashcards will appear here as interactive cards you can flip.</span>
              </div>
            )}
          </div>
        )}

        {activeTab === "paper" && (
          <div className="neu-card">
            <div className="section-title">📋 Question Paper</div>
            {paper ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                {/* MCQ */}
                {paper.mcq && Array.isArray(paper.mcq) && paper.mcq.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, color: "var(--accent)", fontSize: "var(--fs-sm)", marginBottom: "var(--space-3)", display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                      <span className="badge badge-accent">MCQ</span> Multiple Choice
                    </div>
                    {paper.mcq.map((q: any, i: number) => (
                      <div key={i} className="quiz-item">
                        <div className="quiz-q">Q{i + 1}. {q.question || q}</div>
                        {Array.isArray(q.options) && q.options.map((o: string, oi: number) => (
                          <button key={oi} className="quiz-option">
                            <span className="badge badge-muted" style={{ minWidth: 24, justifyContent: "center" }}>
                              {String.fromCharCode(65 + oi)}
                            </span>
                            {o}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {/* Raw fallback */}
                {(!paper.mcq || !Array.isArray(paper.mcq)) && (
                  <div className="output-box">{JSON.stringify(paper, null, 2)}</div>
                )}
              </div>
            ) : (
              <div className="output-box">
                <span className="output-placeholder">A structured question paper with MCQ, MSQ, and long-answer questions will appear here.</span>
              </div>
            )}
          </div>
        )}

        {activeTab === "diagram" && (
          <div className="neu-card">
            <div className="section-title">🗺️ Mermaid Diagram</div>
            {diagram ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div className="output-box" style={{ fontFamily: "'Consolas', monospace", fontSize: "var(--fs-xs)" }}>
                  {diagram}
                </div>
                <div className="neu-card-inset">
                  <p style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                    💡 Copy the code above and paste it into{" "}
                    <a href="https://mermaid.live" target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                      mermaid.live
                    </a>{" "}
                    to render the diagram.
                  </p>
                </div>
              </div>
            ) : (
              <div className="output-box">
                <span className="output-placeholder">Mermaid diagram code will appear here. Paste it into mermaid.live to render.</span>
              </div>
            )}
          </div>
        )}

        {activeTab === "animation" && (
          <div className="neu-card">
            <div className="section-title">🎬 Animation Storyboard</div>
            {animation ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {Array.isArray(animation.scenes || animation.frames || animation.steps)
                  ? (animation.scenes || animation.frames || animation.steps).map((scene: any, i: number) => (
                      <div key={i} className="neu-card-sm" style={{ display: "flex", gap: "var(--space-4)", alignItems: "flex-start" }}>
                        <div className="plan-day-num" style={{ flexShrink: 0 }}>
                          {i + 1}
                        </div>
                        <div>
                          {scene.title && <div style={{ fontWeight: 600, fontSize: "var(--fs-sm)", marginBottom: 4 }}>{scene.title}</div>}
                          <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>
                            {scene.narration || scene.description || String(scene)}
                          </div>
                          {scene.visual && (
                            <div className="badge badge-muted" style={{ marginTop: "var(--space-2)" }}>
                              🎨 {scene.visual}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  : <div className="output-box">{JSON.stringify(animation, null, 2)}</div>
                }
              </div>
            ) : (
              <div className="output-box">
                <span className="output-placeholder">Animation storyboard scenes will be laid out here as numbered cards.</span>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
