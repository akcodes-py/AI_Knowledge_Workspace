"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "./lib/auth";

interface CmdItem {
  id: string;
  category: "Navigation" | "Knowledge" | "Action";
  icon: string;
  title: string;
  action: () => void;
}

export default function CommandPalette({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [docs, setDocs] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      fetchDocs();
    } else {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  async function fetchDocs() {
    try {
      const res = await apiFetch("/api/documents/");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDocs(data);
      }
    } catch {}
  }

  const navCommands: CmdItem[] = [
    { id: "nav-home", category: "Navigation", icon: "🏠", title: "Home Dashboard", action: () => router.push("/") },
    { id: "nav-chat", category: "Navigation", icon: "💬", title: "Ask AI Assistant", action: () => router.push("/chat") },
    { id: "nav-learn", category: "Navigation", icon: "📚", title: "Learn & Notes", action: () => router.push("/learn") },
    { id: "nav-concepts", category: "Navigation", icon: "🧠", title: "Concepts & Knowledge Map", action: () => router.push("/concepts") },
    { id: "nav-analyze", category: "Navigation", icon: "🔍", title: "Analyze & Graphs", action: () => router.push("/analyze") },
    { id: "nav-practice", category: "Navigation", icon: "🎯", title: "Practice & Quizzes", action: () => router.push("/practice") },
    { id: "nav-progress", category: "Navigation", icon: "📈", title: "Learning Progress", action: () => router.push("/progress") },
    { id: "nav-profile", category: "Navigation", icon: "👤", title: "Account & Profile", action: () => router.push("/profile") },
  ];

  const docCommands: CmdItem[] = docs.map((d) => ({
    id: `doc-${d.id}`,
    category: "Knowledge",
    icon: d.type === "youtube" ? "▶️" : d.type === "link" ? "🔗" : "📄",
    title: d.filename,
    action: () => router.push(`/chat?doc_id=${d.id}`),
  }));

  const allItems = [...navCommands, ...docCommands].filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (allItems.length || 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % (allItems.length || 1));
    } else if (e.key === "Enter" && allItems[selectedIndex]) {
      e.preventDefault();
      allItems[selectedIndex].action();
      onClose();
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.6)",
        backdropFilter: "blur(4px)",
        zIndex: 999,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "15vh",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          background: "var(--bg-card)",
          border: "1px solid var(--glass-strong)",
          borderRadius: "var(--radius-sm)",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div style={{ padding: "0.8rem 1rem", borderBottom: "1px solid var(--glass-border)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ color: "var(--text-muted)", fontSize: "1rem" }}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="neu-input"
            placeholder="Search documents, concepts, or jump to page... (Esc to close)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            style={{ border: "none", background: "transparent", fontSize: "0.95rem", padding: "0" }}
          />
          <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", background: "var(--bg-inset)", padding: "0.15rem 0.4rem", borderRadius: "var(--radius-xs)", fontFamily: "var(--font-mono)" }}>
            ESC
          </span>
        </div>

        <div style={{ maxHeight: "360px", overflowY: "auto", padding: "0.4rem" }}>
          {allItems.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
              No matching knowledge or pages found.
            </div>
          ) : (
            allItems.map((item, idx) => (
              <button
                key={item.id}
                onClick={() => {
                  item.action();
                  onClose();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "0.6rem 0.8rem",
                  borderRadius: "var(--radius-xs)",
                  background: idx === selectedIndex ? "var(--bg-card-hover)" : "transparent",
                  border: idx === selectedIndex ? "1px solid var(--glass-border)" : "1px solid transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  marginBottom: "2px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", overflow: "hidden" }}>
                  <span style={{ fontSize: "1.1rem" }}>{item.icon}</span>
                  <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }} className="truncate">
                    {item.title}
                  </span>
                </div>
                <span style={{ fontSize: "0.68rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
