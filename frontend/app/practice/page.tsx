"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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

interface QuizItem {
  question: string;
  type?: string;
  options?: string[];
  answer?: string | string[];
}
interface PlanDay { day?: number; date?: string; topic?: string; tasks?: string[]; hours?: number; }

type Tab = "quiz" | "planner";

function PracticeContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "quiz";

  const [topic, setTopic] = useState(searchParams.get("topic") || "Virtual Memory");
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);

  // Quiz
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [quizCount, setQuizCount] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");

  // Planner
  const [syllabus, setSyllabus] = useState("Virtual Memory, Paging, Page Faults, Process Scheduling");
  const [examDate, setExamDate] = useState("");
  const [hpd, setHpd] = useState(2);
  const [planDays, setPlanDays] = useState<PlanDay[]>([]);

  useEffect(() => {
    const t = searchParams.get("tab") as Tab;
    if (t && ["quiz", "planner"].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  async function generateQuiz() {
    if (!topic.trim()) return;
    setLoading(true);
    setQuizItems([]);
    setSelected({});
    setRevealed(new Set());
    try {
      const j = await postApi("/quiz/", { topic, count: quizCount, difficulty, qtypes: ["MCQ", "MSQ", "TF"] });
      const items = Array.isArray(j.items) ? j.items : [];
      setQuizItems(
        items.map((it: any) =>
          typeof it === "string"
            ? { question: it }
            : { question: it.question || it.stem || String(it), type: it.type, options: it.options, answer: it.answer || it.correct }
        )
      );
    } catch {
      setQuizItems([{ question: "⚠️ Could not reach backend server." }]);
    } finally {
      setLoading(false);
    }
  }

  async function generatePlan() {
    if (!syllabus.trim()) return;
    setLoading(true);
    try {
      const j = await postApi("/notes/planner", { syllabus, exam_date: examDate, hours_per_day: hpd });
      const days = j.days || j.plan?.days || j.schedule || [];
      setPlanDays(Array.isArray(days) ? days : []);
    } catch {
      setPlanDays([{ topic: "⚠️ Could not reach backend server." }]);
    } finally {
      setLoading(false);
    }
  }

  function revealAnswer(i: number) {
    setRevealed((prev) => new Set(prev).add(i));
  }

  function selectOption(qi: number, opt: string) {
    setSelected((prev) => ({ ...prev, [qi]: opt }));
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="page-title">🎯 Practice & Quizzes</h1>
            <p className="page-subtitle">Test your understanding with adaptive questions and personalized study schedules.</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex gap-2 mb-6 border-b border-gray-700 pb-2">
          <button
            onClick={() => setActiveTab("quiz")}
            className={`btn btn-sm ${activeTab === "quiz" ? "btn-primary" : "btn-ghost"}`}
          >
            🎯 Practice Quiz
          </button>
          <button
            onClick={() => setActiveTab("planner")}
            className={`btn btn-sm ${activeTab === "planner" ? "btn-primary" : "btn-ghost"}`}
          >
            📅 Study Planner
          </button>
        </div>

        {/* TAB 1: QUIZ */}
        {activeTab === "quiz" && (
          <div>
            <div className="glass-card mb-6">
              <div className="section-title">🔎 Quiz Configuration</div>
              <div className="bento-grid gap-3">
                <div className="bento-col-6">
                  <label className="text-xs text-muted block mb-1 font-bold">Topic / Concept</label>
                  <input
                    className="neu-input"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Virtual Memory, Paging..."
                  />
                </div>
                <div className="bento-col-3">
                  <label className="text-xs text-muted block mb-1 font-bold">Question Count</label>
                  <select
                    className="neu-input"
                    value={quizCount}
                    onChange={(e) => setQuizCount(Number(e.target.value))}
                  >
                    <option value={3}>3 Questions</option>
                    <option value={5}>5 Questions</option>
                    <option value={10}>10 Questions</option>
                  </select>
                </div>
                <div className="bento-col-3 flex items-end">
                  <button className="btn btn-primary w-full" onClick={generateQuiz} disabled={loading}>
                    {loading ? "Generating..." : "Generate Quiz 🎯"}
                  </button>
                </div>
              </div>
            </div>

            {/* Quiz Items */}
            {quizItems.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {quizItems.map((item, idx) => (
                  <div key={idx} className="glass-card">
                    <div className="flex justify-between items-center mb-3">
                      <span className="badge badge-primary">Question {idx + 1}</span>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text-primary)", marginBottom: "1rem" }}>
                      {item.question}
                    </div>

                    {item.options && item.options.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "1rem" }}>
                        {item.options.map((opt, oi) => {
                          const isSel = selected[idx] === opt;
                          const isRev = revealed.has(idx);
                          return (
                            <button
                              key={oi}
                              onClick={() => selectOption(idx, opt)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.75rem",
                                padding: "0.65rem 1rem",
                                borderRadius: "var(--radius-sm)",
                                background: isSel ? "var(--primary-dim)" : "var(--bg-inset)",
                                border: `1px solid ${isSel ? "var(--primary)" : "var(--glass-border)"}`,
                                cursor: "pointer",
                                textAlign: "left",
                                color: "var(--text-primary)",
                                fontSize: "0.88rem",
                              }}
                            >
                              <span style={{ fontWeight: 700, color: "var(--text-muted)" }}>
                                {String.fromCharCode(65 + oi)}.
                              </span>
                              <span>{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-2" style={{ borderTop: "1px solid var(--glass-border)" }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => revealAnswer(idx)}>
                        {revealed.has(idx) ? "Hide Explanation" : "Reveal Answer & Explanation 💡"}
                      </button>
                    </div>

                    {revealed.has(idx) && (
                      <div className="neu-card-inset mt-3" style={{ background: "var(--bg-inset)", borderLeft: "3px solid var(--primary)" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--primary)", marginBottom: "0.2rem" }}>
                          Answer & Explanation
                        </div>
                        <div style={{ fontSize: "0.85rem", color: "var(--text-primary)", lineHeight: 1.6 }}>
                          {item.answer ? (Array.isArray(item.answer) ? item.answer.join(", ") : item.answer) : "Review concept in source documents."}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: STUDY PLANNER */}
        {activeTab === "planner" && (
          <div className="glass-card">
            <div className="section-title">📅 Personalized Study Schedule</div>
            <div className="mb-4">
              <label className="text-xs text-muted block mb-1 font-bold">Syllabus / Topics to Cover</label>
              <textarea
                className="neu-input"
                rows={3}
                value={syllabus}
                onChange={(e) => setSyllabus(e.target.value)}
                placeholder="Enter syllabus topics or chapter names..."
              />
            </div>

            <button className="btn btn-primary mb-6" onClick={generatePlan} disabled={loading}>
              {loading ? "Generating Schedule..." : "Create Study Plan 🗓️"}
            </button>

            {planDays.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {planDays.map((d, i) => (
                  <div key={i} className="neu-card-inset flex justify-between items-center">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                        {d.day ? `Day ${d.day}` : `Session ${i + 1}`} {d.topic ? `· ${d.topic}` : ""}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.2rem" }}>
                        {d.tasks ? d.tasks.join(" • ") : ""}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function Practice() {
  return (
    <Suspense fallback={<div className="app-shell flex items-center justify-center min-h-screen">Loading...</div>}>
      <PracticeContent />
    </Suspense>
  );
}
