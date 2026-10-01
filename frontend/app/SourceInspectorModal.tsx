"use client";
import { useRouter } from "next/navigation";

interface SourceCitation {
  file: string;
  page?: number;
  section?: string;
  text?: string;
}

export default function SourceInspectorModal({
  isOpen,
  onClose,
  citation,
}: {
  isOpen: boolean;
  onClose: () => void;
  citation: SourceCitation | null;
}) {
  const router = useRouter();

  if (!isOpen || !citation) return null;

  function handleAskMore() {
    onClose();
    const query = `Tell me more about page ${citation?.page || 1} of ${citation?.file}`;
    router.push(`/chat?q=${encodeURIComponent(query)}`);
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "520px",
          background: "var(--bg-card)",
          border: "1px solid var(--glass-strong)",
          borderRadius: "var(--radius-sm)",
          padding: "1.5rem",
          boxShadow: "var(--shadow-lg)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.2rem" }}>📄</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                {citation.file}
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {citation.page ? `Page ${citation.page}` : ""} {citation.section ? `· ${citation.section}` : ""}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ padding: "0.2rem 0.5rem" }}>
            ✕
          </button>
        </div>

        <div className="mb-4">
          <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "0.4rem" }}>
            Source Passage Text
          </div>
          <div
            style={{
              background: "var(--bg-inset)",
              border: "1px solid var(--glass-border)",
              borderRadius: "var(--radius-sm)",
              padding: "0.85rem",
              fontSize: "0.85rem",
              color: "var(--text-primary)",
              lineHeight: "1.6",
              maxHeight: "220px",
              overflowY: "auto",
              fontFamily: "var(--font-sans)",
            }}
          >
            {citation.text || `Reference passage from ${citation.file} (Page ${citation.page || 1}). This passage was retrieved during semantic hybrid search to ground the answer.`}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            Close
          </button>
          <button onClick={handleAskMore} className="btn btn-primary btn-sm">
            Ask AI About This Page →
          </button>
        </div>
      </div>
    </div>
  );
}
