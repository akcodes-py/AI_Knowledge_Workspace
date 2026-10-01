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

interface QuizItem {
  question: string;
  type?: string;
  options?: string[];
  answer?: string | string[];
}
interface PlanDay { day?: number; date?: string; topic?: string; tasks?: string[]; hours?: number; }

type Tab = "quiz" | "planner";

export default function Practice() {
  const [topic, setTopic] = useState("paging");
  const [activeTab, setActiveTab] = useState<Tab>("quiz");
  const [loading, setLoading] = useState(false);

  // Quiz
  const [quizItems, setQuizItems] = useState<QuizItem[]>([]);
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [revealed, setRevealed] = useState<Set<number>>(new Set());
  const [quizCount, setQuizCount] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");

  // Attempt
  const [attemptScore, setAttemptScore] = useState(3);
  const [attemptTotal, setAttemptTotal] = useState(5);
  const [performance, setPerformance] = useState<any[]>([]);
  const [weakTopics, setWeakTopics] = useState<string[]>([]);
  const [followUp, setFollowUp] = useState<any>(null);

  // Planner
  const [syllabus, setSyllabus] = useState("");
  const [examDate, setExamDate] = useState("");
  const [hpd, setHpd] = useState(2);
  const [planDays, setPlanDays] = useState<PlanDay[]>([]);

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
      setQuizItems([{ question: "⚠️ Error reaching backend. Is it running on :8001?" }]);
    } finally {
      setLoading(false);
    }
  }

  async function submitAttempt() {
    setLoading(true);
    try {
      const j = await postApi("/quiz/attempt", { topic, score: attemptScore, total: attemptTotal });
      setPerformance(j.performance || []);
      setWeakTopics(j.weak_topics || []);
      setFollowUp(j.follow_up || null);
    } catch {
      setWeakTopics(["⚠️ Error reaching backend."]);
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
      if (!Array.isArray(days) || days.length === 0) {
        // Fallback: put raw output into day 1
        setPlanDays([{ topic: JSON.stringify(j, null, 2) }]);
      }
    } catch {
      setPlanDays([{ topic: "⚠️ Error reaching backend." }]);
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

  const pct = attemptTotal > 0 ? Math.round((attemptScore / attemptTotal) * 100) : 0;

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="page-title">🎯 Practice & Quizzes</h1>
            <p className="page-subtitle">Test your understanding with adaptive quizzes and personalized study plans.</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* Tab bar */}
        <div className="tab-bar mb-6">
          <button className={`tab${activeTab === "quiz" ? " active" : ""}`} onClick={() => setActiveTab("quiz")}>
            🧠 Quiz & Adaptive Loop
          </button>
          <button className={`tab${activeTab === "planner" ? " active" : ""}`} onClick={() => setActiveTab("planner")}>
            📅 Study Planner
          </button>
        </div>

        {/* ===== QUIZ TAB ===== */}
        {activeTab === "quiz" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "var(--space-6)", alignItems: "start" }}>
            {/* Quiz panel */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              <div className="neu-card">
                <div className="section-title">⚙️ Quiz Settings</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 120px", gap: "var(--space-3)", alignItems: "end" }}>
                  <div>
                    <label style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "var(--space-2)" }}>
                      TOPIC
                    </label>
                    <input
                      className="neu-input"
                      placeholder="e.g. paging, sorting, photosynthesis…"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "var(--space-2)" }}>
                      QUESTIONS
                    </label>
                    <input
                      className="neu-input"
                      type="number"
                      min={1}
                      max={20}
                      value={quizCount}
                      onChange={(e) => setQuizCount(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "var(--space-2)" }}>
                      DIFFICULTY
                    </label>
                    <select
                      className="neu-input"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      style={{ cursor: "pointer" }}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3" style={{ marginTop: "var(--space-5)" }}>
                  <button className="btn btn-green" onClick={generateQuiz} disabled={loading}>
                    {loading ? <><div className="loader loader-sm" /> Generating…</> : "🧠 Generate Quiz"}
                  </button>
                </div>
              </div>

              {quizItems.length > 0 && (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
                    <div className="section-title" style={{ marginBottom: 0 }}>📝 Questions</div>
                    <span className="badge badge-green">{quizItems.length} questions</span>
                    <span className="badge badge-muted">{difficulty}</span>
                  </div>

                  {quizItems.map((q, i) => (
                    <div key={i} className="quiz-item">
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
                        <span className="badge badge-accent">Q{i + 1}</span>
                        {q.type && <span className="badge badge-muted">{q.type}</span>}
                      </div>
                      <div className="quiz-q">{q.question}</div>

                      {q.options && q.options.length > 0 && (
                        <div style={{ marginBottom: "var(--space-3)" }}>
                          {q.options.map((o, oi) => (
                            <button
                              key={oi}
                              className={`quiz-option${selected[i] === o ? " selected" : ""}`}
                              onClick={() => selectOption(i, o)}
                            >
                              <span
                                className="badge"
                                style={{
                                  background: selected[i] === o ? "rgba(108,99,255,0.12)" : "rgba(163,177,198,0.15)",
                                  color: selected[i] === o ? "var(--accent)" : "var(--text-secondary)",
                                  minWidth: 28,
                                  justifyContent: "center",
                                }}
                              >
                                {String.fromCharCode(65 + oi)}
                              </span>
                              {o}
                            </button>
                          ))}
                        </div>
                      )}

                      {revealed.has(i) ? (
                        <div className="neu-card-inset" style={{ marginTop: "var(--space-2)" }}>
                          <span style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--accent-3)" }}>✅ Answer: </span>
                          <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-primary)" }}>
                            {Array.isArray(q.answer) ? q.answer.join(", ") : q.answer || "See explanation"}
                          </span>
                        </div>
                      ) : (
                        <button className="btn btn-neu btn-sm" onClick={() => revealAnswer(i)} style={{ marginTop: "var(--space-2)" }}>
                          👁 Reveal Answer
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {quizItems.length === 0 && !loading && (
                <div className="neu-card">
                  <div className="output-box">
                    <span className="output-placeholder">Quiz questions (MCQ · MSQ · True/False) will appear here. Configure settings and click Generate.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Adaptive sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
              {/* Submit attempt */}
              <div className="neu-card">
                <div className="section-title">📊 Submit Attempt</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  <div>
                    <label style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "var(--space-2)" }}>SCORE</label>
                    <input className="neu-input" type="number" min={0} value={attemptScore} onChange={(e) => setAttemptScore(Number(e.target.value))} />
                  </div>
                  <div>
                    <label style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "var(--space-2)" }}>TOTAL</label>
                    <input className="neu-input" type="number" min={1} value={attemptTotal} onChange={(e) => setAttemptTotal(Number(e.target.value))} />
                  </div>

                  {/* Score pill */}
                  <div className="neu-card-inset" style={{ textAlign: "center", padding: "var(--space-4)" }}>
                    <div style={{
                      fontSize: "var(--fs-2xl)",
                      fontWeight: 700,
                      color: pct >= 70 ? "var(--accent-3)" : pct >= 50 ? "var(--accent-gold)" : "var(--accent-2)",
                    }}>
                      {pct}%
                    </div>
                    <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)" }}>
                      {attemptScore} / {attemptTotal} correct
                    </div>
                  </div>

                  <button className="btn btn-gold" onClick={submitAttempt} disabled={loading}>
                    {loading ? <><div className="loader loader-sm" /> Submitting…</> : "Submit & Get Remedies"}
                  </button>
                </div>
              </div>

              {/* Performance */}
              {performance.length > 0 && (
                <div className="neu-card">
                  <div className="section-title">📈 Performance</div>
                  {performance.map((p: any, i: number) => (
                    <div key={i} className="plan-day" style={{ gap: "var(--space-3)" }}>
                      <div className="plan-day-num" style={{
                        background: p.avg_pct >= 70 ? "rgba(67,233,123,0.1)" : "rgba(255,101,132,0.1)",
                        color: p.avg_pct >= 70 ? "var(--accent-3)" : "var(--accent-2)",
                      }}>
                        {Math.round(p.avg_pct)}%
                      </div>
                      <div>
                        <div className="plan-day-title">{p.topic}</div>
                        <div className="plan-day-meta">{p.attempts} attempt{p.attempts !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Weak topics */}
              {weakTopics.length > 0 && (
                <div className="neu-card">
                  <div className="section-title">⚠️ Weak Areas</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)", marginBottom: "var(--space-3)" }}>
                    {weakTopics.map((t, i) => (
                      <span key={i} className="badge badge-rose">⚠ {t}</span>
                    ))}
                  </div>
                  {followUp && (
                    <div className="neu-card-inset">
                      <div style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--accent-2)", marginBottom: "var(--space-2)" }}>
                        🔄 Remedy Path
                      </div>
                      <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)", lineHeight: 1.6 }}>
                        {followUp.message || ""}
                      </div>
                      {followUp.remedy_notes && (
                        <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "var(--space-2)", whiteSpace: "pre-wrap" }}>
                          {followUp.remedy_notes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== PLANNER TAB ===== */}
        {activeTab === "planner" && (
          <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "var(--space-6)", alignItems: "start" }}>
            {/* Config */}
            <div className="neu-card">
              <div className="section-title">📅 Plan Settings</div>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <div>
                  <label style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "var(--space-2)" }}>
                    SYLLABUS / SUBJECTS
                  </label>
                  <textarea
                    className="neu-input"
                    placeholder="OS: paging, segmentation, scheduling&#10;DS: trees, graphs, sorting…"
                    value={syllabus}
                    rows={5}
                    onChange={(e) => setSyllabus(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "var(--space-2)" }}>
                    EXAM DATE (optional)
                  </label>
                  <input
                    className="neu-input"
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", fontWeight: 600, display: "block", marginBottom: "var(--space-2)" }}>
                    HOURS / DAY
                  </label>
                  <input
                    className="neu-input"
                    type="number"
                    min={0.5}
                    max={12}
                    step={0.5}
                    value={hpd}
                    onChange={(e) => setHpd(Number(e.target.value))}
                  />
                </div>
                <button className="btn btn-primary" onClick={generatePlan} disabled={loading || !syllabus.trim()}>
                  {loading ? <><div className="loader loader-sm" /> Building Plan…</> : "📅 Build Study Plan"}
                </button>
              </div>
            </div>

            {/* Plan output */}
            <div className="neu-card" style={{ minHeight: 400 }}>
              <div className="flex items-center justify-between mb-4" style={{ flexWrap: "wrap", gap: "var(--space-3)" }}>
                <div className="section-title" style={{ marginBottom: 0 }}>📆 Your Study Plan</div>
                {planDays.length > 0 && (
                  <span className="badge badge-accent">{planDays.length} days</span>
                )}
              </div>

              {planDays.length > 0 ? (
                <div>
                  {planDays.map((day: any, i: number) => (
                    <div key={i} className="plan-day">
                      <div className="plan-day-num">D{day.day || i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div className="plan-day-title">
                          {day.topic || day.title || day.subject || `Day ${i + 1}`}
                        </div>
                        {day.tasks && Array.isArray(day.tasks) && (
                          <ul style={{ marginTop: "var(--space-2)", paddingLeft: "var(--space-5)", fontSize: "var(--fs-xs)", color: "var(--text-secondary)", lineHeight: 1.8 }}>
                            {day.tasks.map((t: string, ti: number) => (
                              <li key={ti}>{t}</li>
                            ))}
                          </ul>
                        )}
                        {typeof day === "string" && (
                          <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>{day}</div>
                        )}
                        {day.hours && (
                          <div className="plan-day-meta" style={{ marginTop: "var(--space-1)" }}>
                            ⏱ {day.hours}h · {day.date || ""}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="output-box" style={{ margin: 0 }}>
                  <span className="output-placeholder">
                    Your personalized day-by-day study plan will appear here as a timeline, prioritizing weak topics based on quiz performance.
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
