"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getToken, clearToken, isLoggedIn, exchangeCookieForToken } from "./lib/auth";

interface UserInfo {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export default function UserMenu() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("auth") === "ok") {
      exchangeCookieForToken().then((ok) => {
        if (ok) {
          window.history.replaceState({}, "", window.location.pathname);
          loadUser();
        }
      });
    } else if (isLoggedIn()) {
      loadUser();
    }
  }, []);

  async function loadUser() {
    try {
      const token = getToken();
      const res = await fetch("/api/auth/me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      }
    } catch {
      // not logged in
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    clearToken();
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    setUser(null);
    setMenuOpen(false);
    router.push("/");
  }

  function handleLogin() {
    window.location.href = "/api/auth/login/google";
  }

  return (
    <div className="relative" ref={menuRef} style={{ zIndex: 100 }}>
      {user ? (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              background: "var(--surface)",
              border: "1px solid var(--glass-border)",
              padding: "0.35rem 0.65rem",
              borderRadius: "var(--radius-sm)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            className="btn-ghost"
          >
            {user.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar}
                alt={user.name}
                style={{ width: "24px", height: "24px", borderRadius: "var(--radius-xs)", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "var(--radius-xs)",
                  background: "var(--neon-blue)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: "#fff",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
            <span
              style={{
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                maxWidth: "110px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user.name.split(" ")[0]}
            </span>
            <span style={{ fontSize: "0.6rem", color: "var(--text-muted)" }}>▼</span>
          </button>

          {menuOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 6px)",
                right: 0,
                width: "220px",
                background: "var(--bg-2)",
                border: "1px solid var(--glass-border)",
                borderRadius: "var(--radius-sm)",
                padding: "0.5rem",
                boxShadow: "var(--shadow-lg)",
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              <div style={{ padding: "0.35rem 0.5rem", borderBottom: "1px solid var(--glass-border)" }}>
                <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)" }}>{user.name}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {user.email}
                </div>
              </div>

              <Link
                href="/profile"
                onClick={() => setMenuOpen(false)}
                className="dropdown-item"
              >
                <span>👤</span> Profile & Docs
              </Link>

              <Link
                href="/chat"
                onClick={() => setMenuOpen(false)}
                className="dropdown-item"
              >
                <span>💬</span> AI Assistant
              </Link>

              <div style={{ height: "1px", background: "var(--glass-border)", margin: "0.2rem 0" }} />

              <button
                onClick={handleLogout}
                className="dropdown-item danger"
              >
                <span>🚪</span> Sign Out
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={handleLogin}
          className="btn btn-ghost btn-sm"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--glass-border)",
            fontSize: "0.8rem",
            fontWeight: 600,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Sign In
        </button>
      )}
    </div>
  );
}
