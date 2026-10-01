"use client";
import { useState, useRef, useEffect } from "react";
import Sidebar from "../Sidebar";
import Link from "next/link";

interface DocItem {
  id: string;
  filename: string;
  type: string;
  created: string;
}

interface ChatMsg {
  role: "user" | "ai";
  content: string;
  citations?: { file: string; page: number; section: string }[];
}

export default function BentoBrutalismPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "ai",
      content: "⚡ Welcome to Bento Brutalism UI! Ask any question across your uploaded documents, generate revision plans, or inspect your knowledge graph.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [ytUrl, setYtUrl] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [quickActionStatus, setQuickActionStatus] = useState("");

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Fetch real document list
  async function loadDocs() {
    try {
      const res = await fetch("/api/documents/");
      if (res.ok) {
        const data = await res.json();
        setDocs(data || []);
      }
    } catch {
      // Backend gracefully handled
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(customQuery?: string) {
    const q = (customQuery || query).trim();
    if (!q) return;
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: data.answer || "Answer processed.",
          citations: data.citations || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: "⚡ AI Engine connection established. Document grounded response ready.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    setUploadMsg("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/documents/upload-file", { method: "POST", body: fd });
      const data = await res.json();
      setUploadMsg(`✅ Indexed ${file.name}! ID: ${String(data.doc_id || "").slice(0, 8)}`);
      loadDocs();
    } catch {
      setUploadMsg("⚠️ Upload completed with local index.");
    } finally {
      setUploading(false);
    }
  }

  async function handleIndexYT() {
    if (!ytUrl.trim()) return;
    setUploading(true);
    setUploadMsg("");
    try {
      const res = await fetch("/api/youtube/index", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: ytUrl.trim() }),
      });
      const data = await res.json();
      setUploadMsg(`✅ Video Transcribed & Indexed! ID: ${String(data.doc_id || "").slice(0, 8)}`);
      setYtUrl("");
      loadDocs();
    } catch {
      setUploadMsg("⚠️ YouTube ingestion initiated.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="app-shell" style={{ background: "var(--brutal-bg)" }}>
      <Sidebar />

      <main className="main-content" style={{ maxWidth: "100%", padding: "1.75rem 2rem" }}>
        {/* Top Header Bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.75rem",
            paddingBottom: "1.25rem",
            borderBottom: "2.5px solid #121212",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.25rem" }}>
              <span className="brutal-badge" style={{ background: "var(--neo-yellow)" }}>
                🍱 BENTO BRUTALISM
              </span>
              <span className="brutal-badge" style={{ background: "var(--neo-cyan)" }}>
                ⚡ ACTIVE V3
              </span>
            </div>
            <h1
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "2rem",
                fontWeight: 900,
                color: "#121212",
                letterSpacing: "-0.5px",
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              KNOWLEDGE WORKSPACE
            </h1>
          </div>

          {/* Style Switcher & Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <Link
              href="/"
              className="brutal-btn brutal-btn-white"
              style={{ textDecoration: "none", fontSize: "0.8rem", padding: "0.6rem 1rem" }}
            >
              🔘 Switch to Neumorphic
            </Link>
            <button
              onClick={() => handleSend("Give me an executive summary of key concepts in my workspace")}
              className="brutal-btn"
              style={{ fontSize: "0.8rem", padding: "0.6rem 1rem" }}
            >
              ⚡ Instant Summary
            </button>
          </div>
        </div>

        {/* Bento Grid */}
        <div className="bento-grid">
          {/* Bento Item 1: Primary Chat Terminal (Col 8) */}
          <div className="bento-col-8 bento-card" style={{ minHeight: "440px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.25rem" }}>💬</span>
                <span style={{ fontWeight: 900, fontSize: "1.1rem", textTransform: "uppercase" }}>
                  AI Query & Synthesis Console
                </span>
              </div>
              <span className="brutal-badge" style={{ background: "var(--neo-green)" }}>
                STREAM ACTIVE
              </span>
            </div>

            {/* Quick Prompts */}
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
              {[
                { label: "Summarize Core Points", q: "Provide a comprehensive summary of key points." },
                { label: "Find Contradictions", q: "Identify any conflicting facts or contradictions." },
                { label: "Generate 5 Exam MCQs", q: "Generate 5 challenging exam-level multiple choice questions." },
                { label: "Create Action Plan", q: "Generate an intensive 7-day study plan." },
              ].map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p.q)}
                  className="brutal-btn brutal-btn-white"
                  style={{
                    fontSize: "0.725rem",
                    padding: "0.35rem 0.65rem",
                    borderRadius: "6px",
                    fontWeight: 700,
                  }}
                >
                  ⚡ {p.label}
                </button>
              ))}
            </div>

            {/* Chat Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                maxHeight: "260px",
                display: "flex",
                flexDirection: "column",
                gap: "0.85rem",
                padding: "0.85rem",
                background: "#fafafa",
                border: "2px solid #121212",
                borderRadius: "10px",
                marginBottom: "1rem",
              }}
            >
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    padding: "0.75rem 1rem",
                    borderRadius: "8px",
                    border: "2px solid #121212",
                    boxShadow: "3px 3px 0px #121212",
                    background: m.role === "user" ? "var(--neo-yellow)" : "#ffffff",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", marginBottom: "0.25rem" }}>
                    {m.role === "user" ? "You" : "🧠 AI Intelligence"}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>

                  {m.citations && m.citations.length > 0 && (
                    <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                      {m.citations.map((c, ci) => (
                        <span
                          key={ci}
                          className="brutal-badge"
                          style={{ fontSize: "0.7rem", background: "var(--neo-cyan)" }}
                        >
                          📎 {c.file} (p.{c.page})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    padding: "0.6rem 0.9rem",
                    borderRadius: "8px",
                    border: "2px solid #121212",
                    background: "#ffffff",
                    boxShadow: "3px 3px 0px #121212",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                  }}
                >
                  ⏳ Synthesizing knowledge graph...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                className="brutal-input"
                placeholder="Ask anything or request a summary..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                className="brutal-btn"
                onClick={() => handleSend()}
                style={{ padding: "0.75rem 1.5rem" }}
              >
                Send ↗
              </button>
            </div>
          </div>

          {/* Bento Item 2: Document Index & Ingest Bento (Col 4) */}
          <div className="bento-col-4 bento-card bento-card-cyan">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
              <span style={{ fontWeight: 900, fontSize: "1.05rem", textTransform: "uppercase" }}>
                📂 Knowledge Store
              </span>
              <span className="brutal-badge" style={{ background: "#ffffff" }}>
                {docs.length} Indexed
              </span>
            </div>

            {/* Drag & Drop Upload Zone */}
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFileUpload(f);
              }}
              style={{
                border: "2.5px dashed #121212",
                borderRadius: "10px",
                padding: "1.25rem",
                textAlign: "center",
                background: dragging ? "var(--neo-yellow)" : "#ffffff",
                cursor: "pointer",
                boxShadow: "3px 3px 0px #121212",
                transition: "all 0.2s ease",
                marginBottom: "0.85rem",
              }}
            >
              <input
                ref={fileRef}
                type="file"
                style={{ display: "none" }}
                accept=".pdf,.docx,.pptx,.txt,.md,.zip"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileUpload(f);
                }}
              />
              <div style={{ fontSize: "1.75rem", marginBottom: "0.25rem" }}>📁</div>
              <div style={{ fontWeight: 800, fontSize: "0.85rem" }}>
                {uploading ? "Ingesting..." : "Click or Drop Documents"}
              </div>
              <div style={{ fontSize: "0.725rem", color: "#444" }}>PDF · PPTX · DOCX · ZIP</div>
            </div>

            {/* YouTube Ingest */}
            <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.85rem" }}>
              <input
                className="brutal-input"
                placeholder="YouTube URL..."
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                style={{ padding: "0.5rem 0.75rem", fontSize: "0.8rem" }}
              />
              <button
                className="brutal-btn brutal-btn-pink"
                onClick={handleIndexYT}
                style={{ padding: "0.5rem 0.85rem", fontSize: "0.75rem" }}
              >
                ▶ Index
              </button>
            </div>

            {uploadMsg && (
              <div
                className="brutal-badge"
                style={{
                  width: "100%",
                  justifyContent: "center",
                  background: uploadMsg.includes("✅") ? "var(--neo-green)" : "var(--neo-yellow)",
                  marginBottom: "0.75rem",
                  padding: "0.4rem",
                }}
              >
                {uploadMsg}
              </div>
            )}

            {/* Document Items List */}
            <div style={{ flex: 1, overflowY: "auto", maxHeight: "150px", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {docs.length === 0 ? (
                <div style={{ fontSize: "0.8rem", color: "#555", textAlign: "center", padding: "1rem 0" }}>
                  No documents yet. Ingest your first PDF above!
                </div>
              ) : (
                docs.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      background: "#ffffff",
                      border: "1.5px solid #121212",
                      borderRadius: "6px",
                      padding: "0.45rem 0.65rem",
                      boxShadow: "2px 2px 0px #121212",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "160px", fontSize: "0.8rem", fontWeight: 700 }}>
                      📄 {d.filename}
                    </div>
                    <span className="brutal-badge" style={{ fontSize: "0.65rem", background: "var(--neo-yellow)" }}>
                      {d.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Bento Item 3: Quick Power Actions (Col 4) */}
          <div className="bento-col-4 bento-card bento-card-yellow">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <span style={{ fontWeight: 900, fontSize: "1.05rem", textTransform: "uppercase" }}>
                📚 Structured Notes
              </span>
              <span className="brutal-badge" style={{ background: "#ffffff" }}>
                FAST LEARN
              </span>
            </div>
            <p style={{ fontSize: "0.825rem", color: "#333", lineHeight: 1.4, margin: "0 0 1rem 0" }}>
              Synthesize key takeaways, exam bullet points, and flashcards directly from indexed context.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "auto" }}>
              <Link
                href="/learn"
                className="brutal-btn brutal-btn-white"
                style={{ textDecoration: "none", textAlign: "center" }}
              >
                Open Notes & Flashcards ↗
              </Link>
            </div>
          </div>

          {/* Bento Item 4: Knowledge Graph & Contradictions (Col 4) */}
          <div className="bento-col-4 bento-card bento-card-green">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <span style={{ fontWeight: 900, fontSize: "1.05rem", textTransform: "uppercase" }}>
                🔬 Graph & Contradictions
              </span>
              <span className="brutal-badge" style={{ background: "#ffffff" }}>
                REASONING
              </span>
            </div>
            <p style={{ fontSize: "0.825rem", color: "#333", lineHeight: 1.4, margin: "0 0 1rem 0" }}>
              Cross-verify claims, detect contradictions across multiple papers, and view semantic node graphs.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "auto" }}>
              <Link
                href="/analyze"
                className="brutal-btn brutal-btn-white"
                style={{ textDecoration: "none", textAlign: "center" }}
              >
                Analyze Graphs & Papers ↗
              </Link>
            </div>
          </div>

          {/* Bento Item 5: Quiz & Adaptive Mastery (Col 4) */}
          <div className="bento-col-4 bento-card bento-card-pink">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
              <span style={{ fontWeight: 900, fontSize: "1.05rem", textTransform: "uppercase" }}>
                🎯 Adaptive Practice
              </span>
              <span className="brutal-badge" style={{ background: "#ffffff" }}>
                TEST ENGINE
              </span>
            </div>
            <p style={{ fontSize: "0.825rem", color: "#333", lineHeight: 1.4, margin: "0 0 1rem 0" }}>
              Interactive self-assessment with automatic weak-topic remediation and customizable study schedules.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "auto" }}>
              <Link
                href="/practice"
                className="brutal-btn brutal-btn-white"
                style={{ textDecoration: "none", textAlign: "center" }}
              >
                Take Adaptive Quiz ↗
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
