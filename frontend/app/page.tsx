"use client";
import { useState, useRef, useEffect } from "react";
import Sidebar from "./Sidebar";
import UserMenu from "./UserMenu";
import ThemeToggle from "./ThemeToggle";
import CommandPalette from "./CommandPalette";
import OnboardingModal from "./OnboardingModal";
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

interface ActivityItem {
  id: string;
  icon: string;
  title: string;
  time: string;
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: "ai",
      content: "👋 Welcome! Ask anything about your uploaded sources or select a prompt below to begin.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [ytUrl, setYtUrl] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  useEffect(() => {
    fetchDocs();
    const interval = setInterval(fetchDocs, 4000);
    return () => clearInterval(interval);
  }, []);

  // Shortcut for Command Palette (Ctrl+K / Cmd+K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function fetchDocs() {
    try {
      const res = await apiFetch("/api/documents/");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDocs(data);
      }
    } catch {}
  }

  async function handleSend(customQ?: string) {
    const q = customQ || query.trim();
    if (!q || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    if (!customQ) setQuery("");
    setLoading(true);

    // Track activity
    setActivities((prev) => [
      { id: String(Date.now()), icon: "🧠", title: `Asked: "${q.slice(0, 35)}..."`, time: "Just now" },
      ...prev.slice(0, 4),
    ]);

    try {
      const res = await apiFetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q }),
      });
      const data = await res.json();
      
      let answerText = data.answer || "No response received.";
      // Trustworthy AI fallback check
      if (!data.citations || data.citations.length === 0) {
        if (!answerText.includes("couldn't find")) {
          // preserve natural response
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          content: answerText,
          citations: data.citations || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "I couldn't reach the backend server. Please verify your connection." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(file: File) {
    setUploading(true);
    setUploadMsg("Uploading → Extracting content → Indexing...");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await apiFetch("/api/documents/upload-file", { method: "POST", body: fd });
      const data = await res.json();
      setUploadMsg(`✅ ${file.name} — Added to knowledge base`);
      fetchDocs();
      setActivities((prev) => [
        { id: String(Date.now()), icon: "📄", title: `Added: ${file.name}`, time: "Just now" },
        ...prev.slice(0, 4),
      ]);
    } catch {
      setUploadMsg("⚠️ Upload failed. Please check the file.");
    } finally {
      setUploading(false);
    }
  }

  async function handleIndexYT() {
    const target = ytUrl.trim();
    if (!target) return;
    setUploading(true);
    setUploadMsg("Fetching video transcript & processing...");
    try {
      const res = await apiFetch("/api/documents/youtube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      await res.json();
      setUploadMsg(`✅ YouTube video added`);
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
    setUploadMsg("Extracting web page content & indexing...");
    try {
      const res = await apiFetch("/api/documents/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: target }),
      });
      await res.json();
      setUploadMsg(`✅ Web link added`);
      setLinkUrl("");
      fetchDocs();
    } catch {
      setUploadMsg("⚠️ Web link indexing failed.");
    } finally {
      setUploading(false);
    }
  }

  const readyDocs = docs.filter((d) => d.status === "ready");

  return (
    <div className="app-shell">
      <Sidebar />
      <OnboardingModal />
      <CommandPalette isOpen={cmdOpen} onClose={() => setCmdOpen(false)} />

      <main className="main-content">
        {/* Header */}
        <div className="page-header flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="page-title">{greeting} 👋</h1>
            <p className="page-subtitle">What do you want to understand today?</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCmdOpen(true)}
              className="btn btn-ghost btn-sm"
              style={{ gap: "0.5rem" }}
            >
              <span>🔍</span>
              <span className="text-xs text-muted" style={{ fontFamily: "var(--font-mono)" }}>
                Ctrl+K
              </span>
            </button>
            <ThemeToggle />
            <UserMenu />
          </div>
        </div>

        {/* Ask your knowledge — Prominent AI Search Console */}
        <div className="glass-card mb-8" style={{ border: "1px solid var(--primary)", background: "var(--bg-card)" }}>
          <div className="flex justify-between items-center mb-3">
            <div className="section-title" style={{ margin: 0, fontSize: "1rem" }}>
              <span>💬</span>
              <span>Ask your knowledge</span>
            </div>
            <Link href="/chat" className="btn btn-sm btn-ghost" style={{ fontSize: "0.75rem" }}>
              Open Full Chat ↗
            </Link>
          </div>

          <div className="flex gap-2 mb-4">
            <input
              className="neu-input"
              placeholder="Ask anything about your uploaded sources..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              style={{ fontSize: "0.95rem", padding: "0.75rem 1rem" }}
            />
            <button className="btn btn-primary" onClick={() => handleSend()}>
              Ask ↗
            </button>
          </div>

          {/* Contextual Action Chips */}
          <div className="flex gap-2 flex-wrap">
            {[
              { label: "💡 Explain Concepts", q: "Explain the main key concepts simply with examples." },
              { label: "📝 Summarize Takeaways", q: "Give me a bullet summary of the most important points." },
              { label: "⚖️ Compare Ideas", q: "Compare the main ideas and contrasting points in my sources." },
              { label: "⚠️ Find Contradictions", q: "Identify any potential contradictions or conflicting facts across documents." },
              { label: "🎯 Quiz Me", q: "Generate 5 multiple choice quiz questions to test my understanding." },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleSend(chip.q)}
                className="btn btn-sm btn-ghost"
                style={{ fontSize: "0.78rem" }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Quick Chat Display */}
          {messages.length > 1 && (
            <div className="chat-area mt-4 pt-4" style={{ borderTop: "1px solid var(--glass-border)", maxHeight: "300px" }}>
              {messages.slice(1).map((m, i) => (
                <div key={i} className={m.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}>
                  <div className="chat-label">{m.role === "user" ? "You" : "Personal Knowledge Assistant"}</div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                  {m.citations && m.citations.length > 0 && (
                    <div className="citations">
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", alignSelf: "center" }}>Sources:</span>
                      {m.citations.map((c, ci) => (
                        <span key={ci} className="citation-chip">
                          📄 {c.file} (p.{c.page})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="chat-bubble-ai text-sm text-muted">
                  Understanding sources & answering...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Dashboard Grid */}
        <div className="bento-grid mb-8">
          {/* Continue Learning */}
          <div className="bento-col-7 glass-card">
            <div className="flex justify-between items-center mb-4">
              <div className="section-title" style={{ margin: 0 }}>
                <span>📚</span>
                <span>Continue Learning</span>
              </div>
              <Link href="/progress" className="btn btn-sm btn-ghost">
                View All Progress ↗
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {[
                { name: "Virtual Memory & Paging", progress: 80, status: "Reviewing" },
                { name: "Process Synchronization", progress: 40, status: "Needs Attention" },
                { name: "File Systems & Storage", progress: 30, status: "Needs Attention" },
              ].map((topic) => (
                <div key={topic.name} className="neu-card-inset">
                  <div className="flex justify-between items-center mb-1">
                    <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-primary)" }}>
                      {topic.name}
                    </span>
                    <span className={`badge ${topic.progress >= 75 ? "badge-success" : topic.progress >= 50 ? "badge-primary" : "badge-warning"}`}>
                      {topic.progress}%
                    </span>
                  </div>
                  <div className="progress-bar-bg mb-2">
                    <div className="progress-bar-fill" style={{ width: `${topic.progress}%` }} />
                  </div>
                  <div className="flex justify-between items-center">
                    <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      {topic.status}
                    </span>
                    <Link href={`/chat?q=Explain ${encodeURIComponent(topic.name)}`} className="btn btn-ghost btn-sm" style={{ padding: "0.15rem 0.4rem", fontSize: "0.7rem" }}>
                      Study Concept →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Knowledge Sources / Document Store */}
          <div className="bento-col-5 glass-card">
            <div className="flex justify-between items-center mb-3">
              <div className="section-title" style={{ margin: 0 }}>
                <span>📁</span>
                <span>Knowledge Sources</span>
              </div>
              <span className="badge badge-muted">{docs.length} Sources</span>
            </div>

            {/* Upload dropzone */}
            <div
              className={`upload-zone mb-3 ${dragging ? "dragging" : ""}`}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFileUpload(f);
              }}
            >
              <input
                ref={fileRef}
                type="file"
                style={{ display: "none" }}
                accept=".pdf,.docx,.pptx,.txt,.md,.zip,.png,.jpg,.mp3,.wav"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }}
              />
              <span className="upload-zone-icon">{uploading ? "⏳" : "☁️"}</span>
              <div className="upload-zone-text">{uploading ? "Ingesting..." : "Add Knowledge Source"}</div>
              <div className="upload-zone-sub">PDF · DOCX · PPTX · TXT · ZIP · PNG · MP3</div>
            </div>

            {/* YouTube & Web Links Input */}
            <div className="flex gap-2 mb-2">
              <input
                className="neu-input"
                placeholder="YouTube URL..."
                value={ytUrl}
                onChange={(e) => setYtUrl(e.target.value)}
                style={{ fontSize: "0.78rem", padding: "0.4rem 0.6rem" }}
              />
              <button className="btn btn-teal btn-sm" onClick={handleIndexYT} title="Add YouTube Video">▶</button>
            </div>

            <div className="flex gap-2 mb-3">
              <input
                className="neu-input"
                placeholder="Web article / docs URL..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                style={{ fontSize: "0.78rem", padding: "0.4rem 0.6rem" }}
              />
              <button className="btn btn-teal btn-sm" onClick={handleIndexLink} title="Add Web Link">🔗</button>
            </div>

            {uploadMsg && (
              <div className="neu-card-inset mb-3" style={{ fontSize: "0.75rem", fontWeight: 600, color: uploadMsg.includes("✅") ? "var(--semantic-green)" : "var(--semantic-red)" }}>
                {uploadMsg}
              </div>
            )}

            {/* Document List */}
            <div style={{ maxHeight: "180px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              {docs.length === 0 ? (
                <div className="text-muted text-center" style={{ padding: "1rem 0", fontSize: "0.8rem" }}>
                  No sources added yet. Drop files above!
                </div>
              ) : (
                docs.map((d) => (
                  <div key={d.id} className="neu-card-inset flex justify-between items-center" style={{ padding: "0.4rem 0.65rem" }}>
                    <div className="truncate text-xs" style={{ maxWidth: "160px", fontWeight: 600 }}>
                      {d.type === "youtube" ? "▶️" : d.type === "link" ? "🔗" : "📄"} {d.filename}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="badge badge-muted" style={{ fontSize: "0.6rem" }}>{d.type}</span>
                      {d.status === "processing" ? (
                        <span className="badge badge-warning" style={{ fontSize: "0.6rem" }}>Processing</span>
                      ) : (
                        <span className="badge badge-success" style={{ fontSize: "0.6rem" }}>Ready ✓</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="glass-card">
          <div className="section-title">
            <span>🕒</span>
            <span>Recent Activity</span>
          </div>

          {activities.length === 0 ? (
            <div className="text-muted text-sm text-center p-4">
              Your recent queries and document additions will appear here.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {activities.map((act) => (
                <div key={act.id} className="neu-card-inset flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span style={{ fontSize: "1.1rem" }}>{act.icon}</span>
                    <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{act.title}</span>
                  </div>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{act.time}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
