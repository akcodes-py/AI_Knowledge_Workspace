"use client";
import { useState, useRef, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Sidebar from "../Sidebar";
import UserMenu from "../UserMenu";
import ThemeToggle from "../ThemeToggle";
import SourceInspectorModal from "../SourceInspectorModal";
import { apiFetch } from "../lib/auth";

interface Message {
  role: "user" | "assistant";
  content: string;
  citations?: { file: string; page: number; section: string }[];
  created_at?: string;
}

interface Session {
  id: string;
  last: string;
}

function ChatContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState("default");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activeCitation, setActiveCitation] = useState<{ file: string; page?: number; section?: string } | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadSessions();
    loadHistory("default");
  }, []);

  useEffect(() => {
    if (initialQuery && messages.length === 0 && !loading) {
      sendMessage(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function loadSessions() {
    try {
      const res = await apiFetch("/api/chat/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {}
  }

  async function loadHistory(sessionId: string) {
    setLoadingHistory(true);
    setMessages([]);
    try {
      const res = await apiFetch(`/api/chat/history?session_id=${encodeURIComponent(sessionId)}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch {}
    setLoadingHistory(false);
  }

  function switchSession(id: string) {
    setCurrentSession(id);
    loadHistory(id);
  }

  function newSession() {
    const id = `session-${Date.now()}`;
    setCurrentSession(id);
    setMessages([]);
    setSessions((prev) => [{ id, last: new Date().toISOString() }, ...prev]);
  }

  async function clearHistory() {
    await apiFetch(`/api/chat/history?session_id=${encodeURIComponent(currentSession)}`, { method: "DELETE" });
    setMessages([]);
  }

  async function sendMessage(customQ?: string) {
    const q = customQ || input.trim();
    if (!q || loading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);

    try {
      const res = await apiFetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: q, session_id: currentSession }),
      });
      const data = await res.json();

      let answerText = data.answer || "No response received.";

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: answerText,
          citations: data.citations || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "I couldn't find enough information in your sources to answer this confidently. Try asking a broader question or uploading relevant documents.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const quickPrompts = [
    "⚡ Give me the top 5 takeaways from my documents",
    "🎯 Generate 5 practice quiz questions",
    "📖 Explain the main concepts simply",
    "🗺️ Create a 5-step learning plan",
    "⚖️ Compare main topics across my sources",
    "⚠️ Scan for conflicting information",
  ];

  return (
    <div className="app-shell">
      <Sidebar />
      <SourceInspectorModal
        isOpen={Boolean(activeCitation)}
        onClose={() => setActiveCitation(null)}
        citation={activeCitation}
      />

      {/* Main chat layout */}
      <div style={{ flex: 1, display: "flex", height: "100vh", overflow: "hidden" }}>
        {/* Sessions sidebar */}
        {sidebarOpen && (
          <div
            style={{
              width: "240px",
              background: "var(--bg-sidebar)",
              borderRight: "1px solid var(--glass-border)",
              display: "flex",
              flexDirection: "column",
              padding: "var(--space-4)",
              gap: "var(--space-3)",
              overflowY: "auto",
            }}
          >
            <button className="btn btn-primary w-full" onClick={newSession} style={{ marginBottom: "var(--space-2)" }}>
              + New Conversation
            </button>

            <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Recent Conversations
            </div>

            {sessions.length === 0 ? (
              <div className="text-muted text-xs text-center" style={{ padding: "1rem 0" }}>
                No sessions yet.
              </div>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => switchSession(s.id)}
                  style={{
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${s.id === currentSession ? "var(--primary)" : "var(--glass-border)"}`,
                    background: s.id === currentSession ? "var(--primary-dim)" : "var(--bg-card)",
                    color: s.id === currentSession ? "var(--primary)" : "var(--text-secondary)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "var(--fs-xs)",
                    fontWeight: 600,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  💬 {s.id === "default" ? "Default Session" : s.id.replace("session-", "Session ")}
                </button>
              ))
            )}
          </div>
        )}

        {/* Chat main area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Chat topbar */}
          <div
            style={{
              padding: "var(--space-4) var(--space-6)",
              borderBottom: "1px solid var(--glass-border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--bg-sidebar)",
            }}
          >
            <div className="flex items-center gap-3">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSidebarOpen((v) => !v)}
                title="Toggle session sidebar"
              >
                ☰
              </button>
              <div>
                <div style={{ fontSize: "var(--fs-base)", fontWeight: 700, color: "var(--text-primary)" }}>
                  Ask your knowledge anything
                </div>
                <div className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>
                  Source-grounded personal assistant
                </div>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <button className="btn btn-ghost btn-sm" onClick={clearHistory} title="Clear history">
                🗑️ Clear History
              </button>
              <ThemeToggle />
              <UserMenu />
            </div>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-4)",
            }}
          >
            {messages.length === 0 && !loadingHistory && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: "var(--space-6)" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "2.5rem", marginBottom: "var(--space-2)" }}>💬</div>
                  <h2 style={{ fontSize: "var(--fs-xl)", fontWeight: 800, color: "var(--text-primary)", marginBottom: "var(--space-2)" }}>
                    What would you like to understand?
                  </h2>
                  <p className="text-secondary" style={{ maxWidth: "420px", fontSize: "0.88rem" }}>
                    Ask questions across your notes, documents, and web sources. Every answer is grounded directly in your knowledge.
                  </p>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "var(--space-3)",
                  maxWidth: "560px",
                  width: "100%",
                }}>
                  {quickPrompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendMessage(p.replace(/^[^ ]+ /, ""))}
                      className="glass-card"
                      style={{
                        padding: "0.75rem 1rem",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: "var(--fs-xs)",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: m.role === "user" ? "row-reverse" : "row",
                  gap: "var(--space-3)",
                  alignItems: "flex-start",
                  maxWidth: "800px",
                  width: "100%",
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "var(--radius-xs)",
                    background: m.role === "user" ? "var(--primary)" : "var(--secondary)",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {m.role === "user" ? "U" : "AI"}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    flex: 1,
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-sm)",
                    background: m.role === "user" ? "var(--chat-bg-user)" : "var(--chat-bg-ai)",
                    border: "1px solid var(--chat-border)",
                    fontSize: "var(--fs-sm)",
                    lineHeight: 1.65,
                    color: "var(--text-primary)",
                    maxWidth: "680px",
                  }}
                >
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                  {m.citations && m.citations.length > 0 && (
                    <div className="citations">
                      <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", alignSelf: "center" }}>Sources:</span>
                      {m.citations.map((c, ci) => (
                        <span
                          key={ci}
                          className="citation-chip"
                          onClick={() => setActiveCitation(c)}
                          title="Click to inspect source passage"
                        >
                          📄 {c.file}{c.page > 0 ? ` (p.${c.page})` : ""} [View source]
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: "32px", height: "32px", borderRadius: "var(--radius-xs)",
                    background: "var(--secondary)", color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.85rem", fontWeight: 700,
                  }}
                >
                  AI
                </div>
                <div
                  style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--chat-bg-ai)",
                    border: "1px solid var(--chat-border)",
                    fontSize: "var(--fs-sm)",
                    color: "var(--text-muted)",
                  }}
                >
                  Retrieving knowledge & synthesizing answer...
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input box */}
          <div
            style={{
              padding: "var(--space-4) var(--space-6)",
              borderTop: "1px solid var(--glass-border)",
              background: "var(--bg-sidebar)",
            }}
          >
            <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-end" }}>
              <textarea
                ref={textareaRef}
                rows={1}
                className="neu-input"
                placeholder="Ask anything about your knowledge..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                style={{ resize: "none", minHeight: "44px", maxHeight: "120px" }}
              />
              <button
                className="btn btn-primary"
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                style={{ height: "44px" }}
              >
                Send ↗
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="app-shell flex items-center justify-center min-h-screen">Loading Chat...</div>}>
      <ChatContent />
    </Suspense>
  );
}
