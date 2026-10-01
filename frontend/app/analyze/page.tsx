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

type Tab = "compare" | "contradictions" | "research" | "graph";

function AnalyzeContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab) || "compare";

  const [topic, setTopic] = useState("Paging vs Segmentation");
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);

  const [compare, setCompare] = useState("");
  const [contradictions, setContradictions] = useState<any[]>([]);
  const [research, setResearch] = useState<any>(null);
  const [graph, setGraph] = useState<{ nodes?: string[]; edges?: { from: string; to: string; label?: string }[]; [k: string]: any } | null>(null);

  useEffect(() => {
    const t = searchParams.get("tab") as Tab;
    if (t && ["compare", "contradictions", "research", "graph"].includes(t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

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
      setCompare("⚠️ Could not reach backend server.");
    } finally {
      setLoading(false);
    }
  }

  const tabs: { id: Tab; icon: string; label: string }[] = [
    { id: "compare", icon: "⚖️", label: "Compare Concepts" },
    { id: "contradictions", icon: "⚠️", label: "Find Contradictions" },
    { id: "research", icon: "🔭", label: "Research Summary" },
    { id: "graph", icon: "🔗", label: "Knowledge Graph" },
  ];

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="page-title">🔍 Analyze & Explore</h1>
            <p className="page-subtitle">Discover connections, compare ideas, and identify conflicting statements in your knowledge.</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* Input & Controls */}
        <div className="glass-card mb-6">
          <div className="section-title">🔎 Topic / Concept Query</div>
          <div className="flex gap-2">
            <input
              className="neu-input"
              placeholder="e.g. Paging vs Segmentation, Transformer Attention vs RNN..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
            <button className="btn btn-primary" onClick={run} disabled={loading}>
              {loading ? "Analyzing..." : "Run Analysis ↗"}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b border-gray-700 pb-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`btn btn-sm ${activeTab === t.id ? "btn-primary" : "btn-ghost"}`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab 1: Compare */}
        {activeTab === "compare" && (
          <div className="glass-card">
            <div className="section-title">⚖️ Concept Comparison</div>
            {compare ? (
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: "0.92rem", color: "var(--text-primary)" }}>
                {compare}
              </div>
            ) : (
              <div className="text-muted text-center p-8 text-sm">
                Enter a comparison topic above (e.g. "Paging vs Segmentation") and click <strong>Run Analysis</strong>.
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Contradictions */}
        {activeTab === "contradictions" && (
          <div className="glass-card">
            <div className="section-title">⚠️ Contradiction Inspector</div>
            {contradictions.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {contradictions.map((item, idx) => (
                  <div key={idx} className="neu-card-inset">
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--semantic-amber)", marginBottom: "0.4rem" }}>
                      Potential Discrepancy #{idx + 1}
                    </div>
                    <div style={{ fontSize: "0.88rem", color: "var(--text-primary)", lineHeight: 1.6 }}>
                      {typeof item === "string" ? item : JSON.stringify(item, null, 2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted text-center p-8 text-sm">
                Click <strong>Run Analysis</strong> to scan your sources for conflicting statements or facts.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Research Summary */}
        {activeTab === "research" && (
          <div className="glass-card">
            <div className="section-title">🔭 Research Summary</div>
            {research ? (
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.7, fontSize: "0.92rem", color: "var(--text-primary)" }}>
                {typeof research === "string" ? research : JSON.stringify(research, null, 2)}
              </div>
            ) : (
              <div className="text-muted text-center p-8 text-sm">
                Enter a research topic above to generate a synthesized overview across all sources.
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Knowledge Graph */}
        {activeTab === "graph" && (
          <div className="glass-card">
            <div className="section-title">🔗 Concept Knowledge Graph</div>
            {graph && (graph.nodes || graph.edges) ? (
              <div>
                <div className="mb-4 text-sm text-secondary">
                  Found {graph.nodes?.length || 0} core nodes and {graph.edges?.length || 0} relationships.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.75rem" }}>
                  {graph.nodes?.map((node, i) => (
                    <div key={i} className="neu-card-inset flex items-center gap-2">
                      <span style={{ color: "var(--primary)" }}>●</span>
                      <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{node}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-muted text-center p-8 text-sm">
                Click <strong>Run Analysis</strong> to construct a concept graph from your documents.
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function Analyze() {
  return (
    <Suspense fallback={<div className="app-shell flex items-center justify-center min-h-screen">Loading...</div>}>
      <AnalyzeContent />
    </Suspense>
  );
}
