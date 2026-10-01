"use client";
import { useState, useRef, useEffect } from "react";
import Sidebar from "./Sidebar";
import UserMenu from "./UserMenu";
import Link from "next/link";
import { apiFetch } from "./lib/auth";

interface DocItem {
  id: string;
  filename: string;
  type: string;
  status: string;
  created: string;
}

interface ChatMsg {
  role: "user" | "ai";
  content: string;
  citations?: { file: string; page: number; section: string }[];
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "ai",
      content:
        "👋 Welcome to **AI Knowledge Workspace v2**! Upload documents, YouTube videos, or code repos. Ask anything — I'll answer using RAG over your indexed knowledge base.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [ytUrl, setYtUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchDocs() {
    try {
      const res = await apiFetch("/api/documents/");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDocs(data);
      }
    } catch {}
  }

  useEffect(() => { fetchDocs(); }, []);

  // Poll for processing docs
  useEffect(() => {
    const processing = docs.filter((d) => d.status === "processing");
    if (processing.length === 0) return;
    const id = setInterval(async () => {
      await fetchDocs();
    }, 3000);
    return () => clearInterval(id);
  }, [docs]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(customQuery?: string) {
    const q = (customQuery || query || "Summarize key points from my documents").trim();
    if (!q) return;
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await apiFetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: data.answer || "Knowledge synthesized.",
          citations: data.citations || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "⚡ Error connecting to backend. Is it running on port 8001?" },
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
      const res = await apiFetch("/api/documents/upload-file", { method: "POST", body: fd });
      const data = await res.json();
      setUploadMsg(`✅ ${file.name} — indexing in background...`);
      fetchDocs();
    } catch {
      setUploadMsg("⚠️ Upload failed. Check backend.");
    } finally {
      setUploading(false);
    }
  }

  async function handleIndexYT() {
    const target = ytUrl.trim();
    if (!target) return;
    setUploading(true);
    setUploadMsg("");
    try {
      const res = await apiFetch("/api/documents/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json();
      setUploadMsg(`✅ YouTube queued: ${String(data.doc_id || "").slice(0, 8)}...`);
      setYtUrl("");
      fetchDocs();
    } catch {
      setUploadMsg("⚠️ YouTube indexing failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleIndexLink() {
    const target = linkUrl.trim();
    if (!target) return;
    setUploading(true);
    setUploadMsg("");
    try {
      const res = await apiFetch("/api/documents/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      const data = await res.json();
      setUploadMsg(`✅ Link queued: ${target.slice(0, 30)}...`);
      setLinkUrl("");
      fetchDocs();
    } catch {
      setUploadMsg("⚠️ Web link indexing failed.");
    } finally {
      setUploading(false);
    }
  }

  const readyDocs = docs.filter((d) => d.status === "ready");
  const processingDocs = docs.filter((d) => d.status === "processing");

  return (
    <div className="app-shell">
      <Sidebar />

      <main className="main-content">
        {/* Header */}
        <div className="page-header">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="badge badge-accent">🚀 v2.0</span>
                <span className="badge badge-teal">⚡ RAG+LangGraph</span>
                <span className="badge badge-green">🔒 JWT Auth</span>
              </div>
              <h1 className="page-title">AI Knowledge Workspace</h1>
              <p className="page-subtitle">
                Dark-mode intelligence hub · Gemini 2.0 Flash · Source-grounded RAG
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="btn btn-primary"
                onClick={() => handleSend("Give me a comprehensive summary of all uploaded documents")}
              >
                ⚡ Quick Summary
              </button>
              <Link href="/chat" className="btn btn-teal" style={{ textDecoration: "none" }}>
                💬 Open Chat
              </Link>
              <UserMenu />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid-4 mb-8">
          {[
            { icon: "📄", value: String(readyDocs.length), label: "Indexed Documents", color: "var(--neon-blue)" },
            { icon: "⏳", value: String(processingDocs.length), label: "Processing", color: "var(--neon-amber)" },
            { icon: "💬", value: String(messages.filter((m) => m.role === "user").length), label: "Queries Made", color: "var(--neon-cyan)" },
            { icon: "🎯", value: docs.length > 0 ? "RAG" : "—", label: "Mode Active", color: "var(--neon-green)" },
          ].map((s) => (
            <div
              key={s.label}
              className="stat-card"
              style={{ borderTop: `2px solid ${s.color}` }}
            >
              <div className="stat-icon">{s.icon}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Main Bento Grid */}
        <div className="bento-grid">
          {/* Chat Console */}
          <div className="bento-col-8 glass-card" style={{ minHeight: "500px" }}>
            <div className="flex justify-between items-center mb-4">
              <div className="section-title" style={{ margin: 0 }}>
                <span>💬</span>
                <span>Quick Chat Console</span>
              </div>
              <div className="flex gap-2">
                <span className="badge badge-accent">Gemini 2.0</span>
                <Link href="/chat" className="btn btn-sm btn-ghost" style={{ textDecoration: "none" }}>
                  Full Chat ↗
                </Link>
              </div>
            </div>

            {/* Quick Prompts */}
            <div className="flex gap-2 flex-wrap mb-4">
              {[
                { label: "⚡ Key Takeaways", q: "Give me the 5 most important takeaways in bullet points." },
                { label: "🔬 Contradictions", q: "Identify any contradictions across the uploaded documents." },
                { label: "🎯 Practice Q's", q: "Generate 5 exam-level multiple choice questions with answers." },
                { label: "🗺️ Learning Path", q: "Build a structured 5-step learning path for these topics." },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => handleSend(p.q)}
                  className="btn btn-sm btn-ghost"
                  style={{ borderRadius: "var(--radius-xs)" }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Chat Area */}
            <div className="chat-area mb-4">
              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}>
                  <div className="chat-label">
                    {m.role === "user" ? "You" : "🧠 AI Synthesis"}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                  {m.citations && m.citations.length > 0 && (
                    <div className="citations">
                      {m.citations.map((c, ci) => (
                        <span key={ci} className="citation-chip">
                          📎 {c.file} (p.{c.page})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="chat-bubble-ai flex items-center gap-3">
                  <div className="typing-dots">
                    <span /><span /><span />
                  </div>
                  <span className="text-secondary text-sm">Synthesizing knowledge...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2">
              <input
                className="neu-input"
                placeholder="Ask anything across your documents..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); handleSend(); }
                }}
              />
              <button
                className="btn btn-primary"
                onClick={() => handleSend()}
                style={{ padding: "0.75rem 1.5rem", flexShrink: 0 }}
              >
                Send ↗
              </button>
            </div>
          </div>

          {/* Document Store */}
          <div className="bento-col-4 glass-card glass-cyan">
            <div className="flex justify-between items-center mb-4">
              <div className="section-title" style={{ margin: 0 }}>
                <span>📁</span>
                <span>Document Store</span>
              </div>
              <span className="badge badge-teal">{docs.length} Total</span>
            </div>

            {/* Upload Zone */}
            <div
              className={`upload-zone${dragging ? " dragging" : ""}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFileUpload(f);
              }}
              style={{ marginBottom: "var(--space-3)" }}
            >
              <input
                ref={fileRef}
                type="file"
                style={{ display: "none" }}
                accept=".pdf,.docx,.pptx,.txt,.md,.zip,.png,.jpg,.mp3,.wav"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
              />
              <span className="upload-zone-icon">{uploading ? "⏳" : "☁️"}</span>
              <div className="upload-zone-text">
                {uploading ? "Uploading..." : "Drop File or Click"}
              </div>
              <div className="upload-zone-sub">PDF · DOCX · PPTX · TXT · ZIP · PNG · MP3</div>
            </div>

            {/* YouTube & Web Links */}
            <div className="flex gap-2 mb-2">
              <input
                className="neu-input"
                placeholder="YouTube URL..."
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
              />
              <button className="btn btn-rose btn-sm" onClick={handleIndexYT} title="Index YouTube Video">▶</button>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                className="neu-input"
                placeholder="Web article / docs URL..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                style={{ fontSize: "0.8rem", padding: "0.5rem 0.75rem" }}
              />
              <button className="btn btn-teal btn-sm" onClick={handleIndexLink} title="Index Web Page">🔗</button>
            </div>

            {uploadMsg && (
              <div
                className="neu-card-inset mb-4"
                style={{
                  fontSize: "var(--fs-xs)", fontWeight: 700,
                  color: uploadMsg.includes("✅") ? "var(--neon-green)" : "#f87171",
                  borderColor: uploadMsg.includes("✅") ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)",
                }}
              >
                {uploadMsg}
              </div>
            )}

            {/* Doc List */}
            <div style={{ flex: 1, overflowY: "auto", maxHeight: "200px", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {docs.length === 0 ? (
                <div className="text-muted text-center" style={{ padding: "1rem 0" }}>
                  No files yet. Upload above!
                </div>
              ) : (
                docs.map((d) => (
                  <div
                    key={d.id}
                    style={{
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: "var(--radius-xs)",
                      padding: "0.5rem 0.75rem",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}
                  >
                    <div className="truncate text-sm" style={{ maxWidth: "150px", fontWeight: 600 }}>
                      📄 {d.filename}
                    </div>
                    <div className="flex gap-1 items-center">
                      <span className="badge badge-muted" style={{ fontSize: "0.6rem" }}>{d.type}</span>
                      {d.status === "processing" && (
                        <div className="loader loader-sm" />
                      )}
                      {d.status === "ready" && (
                        <span style={{ color: "var(--neon-green)", fontSize: "0.75rem" }}>✓</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Learn & Notes */}
          <div className="bento-col-4 glass-card glass-purple" style={{ display: "flex", flexDirection: "column" }}>
            <div className="flex justify-between items-center mb-3">
              <div className="section-title" style={{ margin: 0 }}>
                <span>📚</span><span>Learn & Notes</span>
              </div>
              <span className="badge badge-muted">MODULE</span>
            </div>
            <p className="text-secondary text-sm mb-4" style={{ lineHeight: 1.6, flex: 1 }}>
              Synthesize exam bullet points, flashcard decks, and structured summaries from your indexed knowledge base.
            </p>
            <Link href="/learn" className="btn btn-primary w-full" style={{ textDecoration: "none", marginTop: "auto" }}>
              Open Notes & Cards ↗
            </Link>
          </div>

          {/* Analyze */}
          <div className="bento-col-4 glass-card glass-green" style={{ display: "flex", flexDirection: "column" }}>
            <div className="flex justify-between items-center mb-3">
              <div className="section-title" style={{ margin: 0 }}>
                <span>🔬</span><span>Analyze & Graphs</span>
              </div>
              <span className="badge badge-muted">MODULE</span>
            </div>
            <p className="text-secondary text-sm mb-4" style={{ lineHeight: 1.6, flex: 1 }}>
              Cross-verify claims, detect contradictions, view semantic knowledge graphs and Mermaid diagrams.
            </p>
            <Link href="/analyze" className="btn btn-green w-full" style={{ textDecoration: "none", marginTop: "auto" }}>
              Analyze & Map ↗
            </Link>
          </div>

          {/* Practice */}
          <div className="bento-col-4 glass-card glass-pink" style={{ display: "flex", flexDirection: "column" }}>
            <div className="flex justify-between items-center mb-3">
              <div className="section-title" style={{ margin: 0 }}>
                <span>🎯</span><span>Practice & Quiz</span>
              </div>
              <span className="badge badge-muted">MODULE</span>
            </div>
            <p className="text-secondary text-sm mb-4" style={{ lineHeight: 1.6, flex: 1 }}>
              Adaptive quizzes with automatic weak-topic remediation, study planners, and question paper generation.
            </p>
            <Link href="/practice" className="btn btn-rose w-full" style={{ textDecoration: "none", marginTop: "auto" }}>
              Start Adaptive Quiz ↗
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
