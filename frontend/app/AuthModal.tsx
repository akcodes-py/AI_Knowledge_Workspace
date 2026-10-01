"use client";
import React, { useState } from "react";
import { setToken } from "./lib/auth";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  actionTitle?: string;
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = "upload documents and save your work",
}: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleEmailLogin(targetEmail?: string) {
    const activeEmail = targetEmail || email;
    if (!activeEmail || !activeEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: activeEmail,
          name: name || activeEmail.split("@")[0],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Sign-in failed");
      }

      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        if (onSuccess) onSuccess();
        onClose();
        window.location.reload(); // Refresh session state across components
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleLogin() {
    window.location.href = "/api/auth/login/google";
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(9, 9, 11, 0.75)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "var(--bg-1)",
          border: "1px solid var(--glass-border)",
          borderRadius: "var(--radius-md)",
          padding: "1.75rem",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "var(--radius-xs)",
                background: "rgba(79, 70, 229, 0.15)",
                border: "1px solid rgba(79, 70, 229, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--neon-indigo)",
                fontSize: "1.1rem",
              }}
            >
              🔒
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)" }}>
                Sign In Required
              </h3>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Please sign in to {actionTitle}.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-muted)",
              fontSize: "1.2rem",
              cursor: "pointer",
              padding: "0.2rem",
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {error && (
          <div
            style={{
              background: "rgba(225, 29, 72, 0.1)",
              border: "1px solid rgba(225, 29, 72, 0.3)",
              color: "#fb7185",
              padding: "0.6rem 0.8rem",
              borderRadius: "var(--radius-xs)",
              fontSize: "0.8rem",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Option 1: Google OAuth */}
        <button
          onClick={handleGoogleLogin}
          className="btn btn-ghost"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.6rem",
            padding: "0.7rem",
            borderRadius: "var(--radius-xs)",
            border: "1px solid var(--glass-border)",
            background: "var(--surface)",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            margin: "0.2rem 0",
          }}
        >
          <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }} />
          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            or Email
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--glass-border)" }} />
        </div>

        {/* Option 2: Email Sign-in */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleEmailLogin();
          }}
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 0.8rem",
                borderRadius: "var(--radius-xs)",
                border: "1px solid var(--glass-border)",
                background: "var(--bg-2)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.3rem" }}>
              Your Name (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Atul Kumar"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 0.8rem",
                borderRadius: "var(--radius-xs)",
                border: "1px solid var(--glass-border)",
                background: "var(--bg-2)",
                color: "var(--text-primary)",
                fontSize: "0.85rem",
                outline: "none",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: "100%",
              padding: "0.65rem",
              borderRadius: "var(--radius-xs)",
              fontWeight: 600,
              fontSize: "0.85rem",
              marginTop: "0.25rem",
              cursor: loading ? "wait" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Continue with Email →"}
          </button>
        </form>

        {/* Quick Demo Login Option */}
        <div style={{ textAlign: "center", borderTop: "1px solid var(--glass-border)", paddingTop: "0.8rem" }}>
          <button
            type="button"
            onClick={() => handleEmailLogin("demo.user@workspace.ai")}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--neon-indigo)",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            ⚡ Quick 1-Click Demo Login
          </button>
        </div>
      </div>
    </div>
  );
}
