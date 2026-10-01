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

type Tab = "compare" | "contradictions" | "research" | "graph";

export default function Analyze() {
  const [topic, setTopic] = useState("paging vs segmentation");
  const [activeTab, setActiveTab] = useState<Tab>("compare");
  const [loading, setLoading] = useState(false);

  const [compare, setCompare] = useState("");
  const [contradictions, setContradictions] = useState<any[]>([]);
  const [research, setResearch] = useState<any>(null);
  const [graph, setGraph] = useState<{ nodes?: string[]; edges?: { from: string; to: string; label?: string }[]; [k: string]: any } | null>(null);

  async function run() {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      if (activeTab === "compare") {
        const j = await postApi("/notes/compare", { topic });
        setCompare(j.markdown || "");
      } else if (activeTab === "contradictions") {
        const j = await postApi("/notes/contradictions", { topic });
        setContradictions(Array.isArray(j.items) ? j.items : []);
      } else if (activeTab === "research") {
        const j = await postApi("/notes/research", { topic });
        setResearch(j);
      } else if (activeTab === "graph") {
        const j = await postApi("/notes/graph", { topic });
        setGraph(j);
      }
    } catch {
      setCompare("⚠️ Error reaching backend.");
    } finally {
      setLoading(false);
    }
  }

  const tabs: { id: Tab; icon: string; label: string; color: string }[] = [
    { id: "compare",       icon: "⚖️",  label: "Compare",         color: "btn-primary" },
    { id: "contradictions",icon: "⚡",  label: "Contradictions",  color: "btn-rose" },
    { id: "research",      icon: "🔭",  label: "Research Summary", color: "btn-teal" },
    { id: "graph",         icon: "🕸️",  label: "Knowledge Graph",  color: "btn-gold" },
  ];

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="page-title">🔍 Analyze & Explore</h1>
            <p className="page-subtitle">Discover connections, compare concepts, and identify potential contradictions.</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* Topic input */}
        <div className="neu-card mb-6">
          <div className="section-title">🔎 Topic / Query</div>
          <div className="input-group">
            <input
              className="neu-input"
              placeholder="e.g. paging vs segmentation, transformer attention…"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              style={{ borderRadius: "var(--radius)" }}
            />
            <button
              className={`btn ${tabs.find((t) => t.id === activeTab)?.color || "btn-primary"}`}
              onClick={run}
              disabled={loading}
            >
              {loading ? <><div className="loader loader-sm" /> Analyzing…</> : "Analyze 🔬"}
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="tab-bar">
          {tabs.map((t) => (
            <button key={t.id} className={`tab${activeTab === t.id ? " active" : ""}`} onClick={() => setActiveTab(t.id)}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Compare */}
        {activeTab === "compare" && (
          <div className="neu-card">
            <div className="section-title">⚖️ Document Comparison</div>
            {compare ? (
              <div className="output-box" style={{ fontFamily: "var(--font-sans)" }}>{compare}</div>
            ) : (
              <div className="output-box"><span className="output-placeholder">A side-by-side comparison of documents will appear here.</span></div>
            )}
          </div>
        )}

        {/* Contradictions */}
        {activeTab === "contradictions" && (
          <div className="neu-card">
            <div className="flex items-center justify-between mb-4" style={{ flexWrap: "wrap", gap: "var(--space-3)" }}>
              <div className="section-title" style={{ marginBottom: 0 }}>⚡ Contradictions Found</div>
              {contradictions.length > 0 && (
                <span className="badge badge-rose">{contradictions.length} contradictions</span>
              )}
            </div>
            {contradictions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {contradictions.map((c: any, i: number) => (
                  <div key={i} className="neu-card-sm" style={{ borderLeft: "3px solid var(--accent-2)", paddingLeft: "var(--space-5)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
                      <span className="badge badge-rose">#{i + 1}</span>
                      {c.severity && <span className="badge badge-muted">{c.severity}</span>}
                    </div>
                    <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-primary)", fontWeight: 500 }}>
                      {typeof c === "string" ? c : c.description || c.contradiction || JSON.stringify(c)}
                    </div>
                    {c.sources && (
                      <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", marginTop: "var(--space-2)" }}>
                        Sources: {Array.isArray(c.sources) ? c.sources.join(", ") : c.sources}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="output-box"><span className="output-placeholder">Detected contradictions between documents will be listed as flagged cards.</span></div>
            )}
          </div>
        )}

        {/* Research */}
        {activeTab === "research" && (
          <div className="neu-card">
            <div className="section-title">🔭 Research Summary</div>
            {research ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)" }}>
                {research.title && (
                  <div style={{ fontSize: "var(--fs-xl)", fontWeight: 700, color: "var(--text-primary)" }}>{research.title}</div>
                )}
                {research.abstract && (
                  <div className="neu-card-sm">
                    <div style={{ fontSize: "var(--fs-xs)", fontWeight: 600, color: "var(--accent-teal)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: "var(--space-2)" }}>Abstract</div>
                    <div style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)", lineHeight: 1.7 }}>{research.abstract}</div>
                  </div>
                )}
                {research.key_points && Array.isArray(research.key_points) && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "var(--fs-sm)", marginBottom: "var(--space-3)", color: "var(--text-primary)" }}>🔑 Key Points</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                      {research.key_points.map((p: string, i: number) => (
                        <div key={i} className="neu-card-sm" style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                          <span style={{ color: "var(--accent-teal)", fontWeight: 700, fontSize: "var(--fs-xs)" }}>0{i + 1}</span>
                          <span style={{ fontSize: "var(--fs-sm)", color: "var(--text-secondary)" }}>{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {!research.title && !research.abstract && !research.key_points && (
                  <div className="output-box">{JSON.stringify(research, null, 2)}</div>
                )}
              </div>
            ) : (
              <div className="output-box"><span className="output-placeholder">A structured research summary with abstract, key points, and methodology will appear here.</span></div>
            )}
          </div>
        )}

        {/* Knowledge Graph */}
        {activeTab === "graph" && (
          <div className="neu-card">
            <div className="flex items-center justify-between mb-4" style={{ flexWrap: "wrap", gap: "var(--space-3)" }}>
              <div className="section-title" style={{ marginBottom: 0 }}>🕸️ Knowledge Graph</div>
              {graph && (
                <div style={{ display: "flex", gap: "var(--space-2)" }}>
                  {graph.nodes && <span className="badge badge-gold">{graph.nodes.length} nodes</span>}
                  {graph.edges && <span className="badge badge-muted">{graph.edges.length} edges</span>}
                </div>
              )}
            </div>

            {graph ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
                {/* Nodes */}
                {graph.nodes && Array.isArray(graph.nodes) && graph.nodes.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "var(--fs-sm)", color: "var(--text-primary)", marginBottom: "var(--space-3)" }}>Concepts</div>
                    <div style={{ display: "flex", flexWrap: "wrap" }}>
                      {graph.nodes.map((n: any, i: number) => (
                        <span key={i} className="kg-node">
                          ◆ {typeof n === "string" ? n : n.id || n.label || JSON.stringify(n)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edges */}
                {graph.edges && Array.isArray(graph.edges) && graph.edges.length > 0 && (
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "var(--fs-sm)", color: "var(--text-primary)", marginBottom: "var(--space-3)" }}>Relationships</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                      {graph.edges.slice(0, 20).map((e: any, i: number) => (
                        <div key={i} className="neu-card-sm" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", fontSize: "var(--fs-sm)" }}>
                          <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                            {typeof e === "string" ? e : e.from || e.source || "?"}
                          </span>
                          <span style={{ color: "var(--text-muted)", fontSize: "var(--fs-xs)" }}>
                            ──{typeof e === "object" && e.label ? ` ${e.label} ` : "→"}──▶
                          </span>
                          <span style={{ color: "var(--accent-teal)", fontWeight: 600 }}>
                            {typeof e === "object" ? e.to || e.target || "?" : ""}
                          </span>
                        </div>
                      ))}
                      {graph.edges.length > 20 && (
                        <div className="text-xs text-muted">+ {graph.edges.length - 20} more relationships</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="output-box"><span className="output-placeholder">Knowledge graph nodes and edges will be displayed here as interactive concept bubbles.</span></div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
