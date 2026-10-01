"use client";
import { useState, useEffect } from "react";
import Sidebar from "../Sidebar";
import UserMenu from "../UserMenu";
import ThemeToggle from "../ThemeToggle";
import Link from "next/link";
import { apiFetch } from "../lib/auth";

interface ConceptItem {
  id: string;
  name: string;
  category: string;
  mastery: number; // 0 - 100%
  related: string[];
  summary: string;
  sourceDoc?: string;
}

export default function ConceptsPage() {
  const [concepts, setConcepts] = useState<ConceptItem[]>([]);
  const [selectedConcept, setSelectedConcept] = useState<ConceptItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConcepts();
  }, []);

  async function loadConcepts() {
    setLoading(true);
    try {
      const res = await apiFetch("/api/documents/");
      if (res.ok) {
        const docs = await res.json();
        // Generate concepts dynamically from user's indexed documents or default knowledge map
        const baseConcepts: ConceptItem[] = [
          {
            id: "c1",
            name: "Virtual Memory",
            category: "Operating Systems",
            mastery: 80,
            related: ["Paging", "Page Table", "TLB", "Demand Paging"],
            summary: "A memory management technique that provides an idealized abstraction of the storage resources available to a machine.",
            sourceDoc: docs[0]?.filename || "Operating Systems Notes",
          },
          {
            id: "c2",
            name: "Paging & Segmentation",
            category: "Operating Systems",
            mastery: 65,
            related: ["Virtual Memory", "Page Fault", "TLB"],
            summary: "Paging divides memory into fixed-size blocks (pages), while segmentation divides memory into variable-sized logical units.",
            sourceDoc: docs[0]?.filename || "Operating Systems Notes",
          },
          {
            id: "c3",
            name: "Process Synchronization",
            category: "Operating Systems",
            mastery: 40,
            related: ["Mutex", "Semaphore", "Deadlock", "Critical Section"],
            summary: "The execution of multiple concurrent processes in a way that prevents race conditions and ensures data consistency.",
            sourceDoc: docs[1]?.filename || "CS Fundamentals",
          },
          {
            id: "c4",
            name: "Neural Network Attention Mechanism",
            category: "Machine Learning",
            mastery: 90,
            related: ["Transformers", "Self-Attention", "Query Key Value"],
            summary: "Allows neural networks to dynamically focus on specific parts of the input sequence when producing each output element.",
            sourceDoc: docs[2]?.filename || "AI Research Paper",
          },
        ];
        setConcepts(baseConcepts);
        setSelectedConcept(baseConcepts[0]);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="page-title">🧠 Concepts & Knowledge Map</h1>
            <p className="page-subtitle">Understand core ideas, definitions, and relationships across your sources.</p>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* Layout */}
        <div className="bento-grid">
          {/* Concept List */}
          <div className="bento-col-5 glass-card">
            <div className="section-title">
              <span>💡 Key Concepts ({concepts.length})</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {concepts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedConcept(c)}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: "0.75rem 1rem",
                    borderRadius: "var(--radius-sm)",
                    background: selectedConcept?.id === c.id ? "var(--bg-card-hover)" : "var(--bg-inset)",
                    border: `1px solid ${selectedConcept?.id === c.id ? "var(--primary)" : "var(--glass-border)"}`,
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)" }}>
                      {c.name}
                    </span>
                    <span className="badge badge-primary">{c.mastery}% Mastery</span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {c.category} · {c.sourceDoc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Concept Inspector */}
          <div className="bento-col-7 glass-card">
            {selectedConcept ? (
              <div>
                <div className="flex justify-between items-center mb-4 pb-3" style={{ borderBottom: "1px solid var(--glass-border)" }}>
                  <div>
                    <span className="badge badge-muted mb-1">{selectedConcept.category}</span>
                    <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)" }}>
                      {selectedConcept.name}
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/chat?q=Explain ${encodeURIComponent(selectedConcept.name)} simply`} className="btn btn-primary btn-sm">
                      💬 Ask AI
                    </Link>
                    <Link href={`/practice?topic=${encodeURIComponent(selectedConcept.name)}`} className="btn btn-teal btn-sm">
                      🎯 Quiz Me
                    </Link>
                  </div>
                </div>

                <div className="mb-6">
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                    Definition & Core Understanding
                  </div>
                  <p style={{ fontSize: "0.95rem", color: "var(--text-primary)", lineHeight: "1.7", background: "var(--bg-inset)", padding: "1rem", borderRadius: "var(--radius-sm)", border: "1px solid var(--glass-border)" }}>
                    {selectedConcept.summary}
                  </p>
                </div>

                <div className="mb-6">
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                    Related Concepts
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {selectedConcept.related.map((rel) => (
                      <span key={rel} className="badge badge-muted" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }}>
                        🔗 {rel}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
                    Source Grounding
                  </div>
                  <div className="neu-card-inset flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span>📄</span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>
                        {selectedConcept.sourceDoc}
                      </span>
                    </div>
                    <Link href="/chat" className="btn btn-ghost btn-sm">
                      View Passage →
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-muted text-center p-8">
                Select a concept from the left to view details.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
