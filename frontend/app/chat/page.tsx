"use client";
import { useState, useRef, useEffect } from "react";
import Sidebar from "../Sidebar";
import UserMenu from "../UserMenu";
import ThemeToggle from "../ThemeToggle";
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

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState("default");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadSessions();
    loadHistory("default");
  }, []);

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

  async function sendMessage() {
    const q = input.trim();
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
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.answer || "No answer received.",
          citations: data.citations || [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "⚠️ Error connecting to the AI backend. Please ensure it is running." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => loadSessions(), 500);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    const t = e.target;
    t.style.height = "auto";
    t.style.height = Math.min(t.scrollHeight, 160) + "px";
  }

  const quickPrompts = [
    "📋 Summarize all my documents",
    "🔬 Find contradictions",
    "🎯 Generate 5 quiz questions",
    "📖 Explain the main concepts",
    "🗺️ Create a study plan",
    "💡 What are the key insights?",
  ];

  return (
    <div className="app-shell">
      <Sidebar />

      {/* Main chat layout */}
      <div style={{ flex: 1, display: "flex", height: "100vh", overflow: "hidden" }}>
        {/* Sessions sidebar */}
        {sidebarOpen && (
          <div
            style={{
              width: "240px",
              background: "rgba(13,18,32,0.9)",
              borderRight: "1px solid var(--glass-border)",
              display: "flex",
              flexDirection: "column",
              padding: "var(--space-4)",
              gap: "var(--space-3)",
              overflowY: "auto",
            }}
          >
            <button className="btn btn-primary w-full" onClick={newSession} style={{ marginBottom: "var(--space-2)" }}>
              + New Chat
            </button>

            <div style={{ fontSize: "var(--fs-xs)", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
              Recent Chats
            </div>

            {sessions.length === 0 ? (
              <div className="text-muted text-xs text-center" style={{ padding: "1rem 0" }}>
                No sessions yet. Start chatting!
              </div>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => switchSession(s.id)}
                  style={{
                    padding: "var(--space-3)",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${s.id === currentSession ? "rgba(59,130,246,0.5)" : "var(--glass-border)"}`,
                    background: s.id === currentSession ? "var(--neon-blue-dim)" : "var(--surface)",
                    color: s.id === currentSession ? "var(--text-white)" : "var(--text-secondary)",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "var(--fs-xs)",
                    fontWeight: 600,
                    transition: "all 0.15s ease",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  💬 {s.id === "default" ? "Default Chat" : s.id.replace("session-", "Chat ")}
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
              background: "rgba(13,18,32,0.8)",
              backdropFilter: "blur(10px)",
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
                <div className="text-white font-bold" style={{ fontSize: "var(--fs-base)" }}>
                  🤖 AI Knowledge Assistant
                </div>
                <div className="text-muted" style={{ fontSize: "var(--fs-xs)" }}>
                  Powered by Gemini 2.0 Flash · RAG on your documents
                </div>
              </div>
            </div>
            <div className="flex gap-2 items-center">
              <button className="btn btn-ghost btn-sm" onClick={clearHistory} title="Clear history">
                🗑️ Clear
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
              gap: "var(--space-5)",
            }}
          >
            {messages.length === 0 && !loadingHistory && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, gap: "var(--space-6)" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: "3.5rem", marginBottom: "var(--space-4)" }}>🧠</div>
                  <h2 className="gradient-text" style={{ fontSize: "var(--fs-2xl)", fontWeight: 900, marginBottom: "var(--space-2)" }}>
                    AI Knowledge Assistant
                  </h2>
                  <p className="text-secondary" style={{ maxWidth: "400px" }}>
                    Ask me anything about your uploaded documents. I use RAG to ground every answer in your knowledge base.
                  </p>
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "var(--space-3)",
                  maxWidth: "600px",
                  width: "100%",
                }}>
                  {quickPrompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => { setInput(p.replace(/^[^ ]+ /, "")); textareaRef.current?.focus(); }}
                      className="glass-card"
                      style={{
                        padding: "var(--space-4)",
                        cursor: "pointer",
                        textAlign: "left",
                        fontSize: "var(--fs-xs)",
                        fontWeight: 600,
                        color: "var(--text-secondary)",
                        border: "1px solid var(--glass-border)",
                        background: "var(--surface)",
                        borderRadius: "var(--radius-sm)",
                        transition: "all 0.2s ease",
                      }}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {loadingHistory && (
              <div className="flex items-center justify-center" style={{ flex: 1 }}>
                <div className="loader" />
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
                    width: "34px", height: "34px", borderRadius: "50%",
                    background: m.role === "user"
                      ? "linear-gradient(135deg, var(--neon-blue), var(--neon-purple))"
                      : "linear-gradient(135deg, var(--neon-cyan), var(--neon-green))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.9rem", flexShrink: 0,
                    boxShadow: m.role === "user" ? "var(--glow-blue)" : "var(--glow-cyan)",
                  }}
                >
                  {m.role === "user" ? "👤" : "🧠"}
                </div>

                {/* Bubble */}
                <div
                  style={{
                    flex: 1,
                    padding: "var(--space-4) var(--space-5)",
                    borderRadius: m.role === "user"
                      ? "var(--radius) var(--radius-xs) var(--radius) var(--radius)"
                      : "var(--radius-xs) var(--radius) var(--radius) var(--radius)",
                    background: m.role === "user"
                      ? "linear-gradient(135deg, rgba(59,130,246,0.25), rgba(168,85,247,0.20))"
                      : "var(--surface)",
                    border: `1px solid ${m.role === "user" ? "rgba(59,130,246,0.35)" : "var(--glass-border)"}`,
                    fontSize: "var(--fs-sm)",
                    lineHeight: 1.75,
                    color: "var(--text-primary)",
                    maxWidth: "680px",
                  }}
                >
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                  {m.citations && m.citations.length > 0 && (
                    <div className="citations">
                      {m.citations.map((c, ci) => (
                        <span key={ci} className="citation-chip">
                          📎 {c.file}{c.page > 0 ? ` p.${c.page}` : ""}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "flex-start" }}>
                <div style={{
                  width: "34px", height: "34px", borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--neon-cyan), var(--neon-green))",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.9rem",
                }}>🧠</div>
                <div style={{
                  padding: "var(--space-4) var(--space-5)",
                  borderRadius: "var(--radius-xs) var(--radius) var(--radius) var(--radius)",
                  background: "var(--surface)",
                  border: "1px solid var(--glass-border)",
                }}>
                  <div className="typing-dots">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div
            style={{
              padding: "var(--space-4) var(--space-6)",
              borderTop: "1px solid var(--glass-border)",
              background: "rgba(13,18,32,0.9)",
              backdropFilter: "blur(10px)",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "var(--space-3)",
                alignItems: "flex-end",
                background: "rgba(0,0,0,0.3)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius)",
                padding: "var(--space-3) var(--space-4)",
                transition: "border-color 0.2s ease",
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={autoResize}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything... (Enter to send, Shift+Enter for new line)"
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  resize: "none",
                  font: "inherit",
                  fontSize: "var(--fs-sm)",
                  color: "var(--text-primary)",
                  lineHeight: 1.6,
                  maxHeight: "160px",
                  minHeight: "24px",
                  overflowY: "auto",
                }}
                rows={1}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="btn btn-primary"
                style={{ padding: "0.6rem 1.25rem", flexShrink: 0 }}
              >
                {loading ? <div className="loader loader-sm" /> : "↑ Send"}
              </button>
            </div>
            <div className="text-muted text-center" style={{ fontSize: "0.7rem", marginTop: "var(--space-2)" }}>
              Answers grounded in your uploaded documents via RAG · Gemini 2.0 Flash
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
