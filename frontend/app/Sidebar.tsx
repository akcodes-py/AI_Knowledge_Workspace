"use client";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { getToken, clearToken, isLoggedIn, exchangeCookieForToken } from "./lib/auth";
import ThemeToggle from "./ThemeToggle";

const navItems = [
  {
    group: "Workspace",
    links: [
      { href: "/",         icon: "🏠", label: "Home" },
      { href: "/chat",     icon: "💬", label: "AI Chat Assistant" },
      { href: "/learn",    icon: "📚", label: "Learn & Notes" },
      { href: "/analyze",  icon: "🔬", label: "Analyze & Graph" },
      { href: "/practice", icon: "🎯", label: "Practice & Quiz" },
    ],
  },
];

interface UserInfo {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for cookie→token exchange (post OAuth redirect)
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
      // Not logged in
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleLogout() {
    clearToken();
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    setUser(null);
    setDropdownOpen(false);
    router.push("/");
  }

  function handleLogin() {
    window.location.href = "/api/auth/login/google";
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <Link href="/" className="brand">
        <div className="brand-icon">🧠</div>
        <div>
          <div className="brand-name">AI Knowledge</div>
          <div className="brand-tagline">Workspace v2</div>
        </div>
      </Link>

      {/* Nav groups */}
      {navItems.map((group) => (
        <div key={group.group} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)" }}>
          <div className="nav-section-label">{group.group}</div>
          {group.links.map((link) => {
            const isActive =
              link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link${isActive ? " active" : ""}`}
              >
                <span className="nav-link-icon">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Status */}
      <div className="sidebar-status-card" style={{ marginBottom: "var(--space-3)" }}>
        <div className="flex items-center gap-2 justify-center mb-1">
          <span className="status-indicator-live" />
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "0.5px" }}>
            AI CORE LIVE
          </span>
        </div>
        <div style={{ fontSize: "11px", fontWeight: 500, color: "var(--text-muted)", textAlign: "center" }}>
          Gemini 2.0 Flash · RAG Active
        </div>
      </div>

      {/* Theme Switcher */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-2)" }}>
        <ThemeToggle />
      </div>

      {/* Profile / Auth — Bottom of sidebar */}
      <div className="relative" ref={dropdownRef}>
        {user ? (
          <>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                width: "100%",
                padding: "var(--space-3)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--glass-border)",
                background: "var(--surface)",
                cursor: "pointer",
                transition: "all 0.2s ease",
                color: "var(--text-primary)",
              }}
              className="user-profile-btn"
            >
              {user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatar} alt={user.name} className="user-avatar" />
              ) : (
                <div className="avatar-placeholder">
                  {user.name?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
              <div style={{ flex: 1, textAlign: "left", overflow: "hidden" }}>
                <div style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--text-white)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.name}
                </div>
                <div style={{ fontSize: "var(--fs-xs)", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {user.email}
                </div>
              </div>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>▼</span>
            </button>

            {dropdownOpen && (
              <div className="user-dropdown" style={{ bottom: "calc(100% + 8px)", top: "auto" }}>
                <Link href="/profile" className="dropdown-item" onClick={() => setDropdownOpen(false)}>
                  👤 Profile & Account
                </Link>
                <div className="dropdown-divider" />
                <button className="dropdown-item danger" onClick={handleLogout}>
                  🚪 Sign Out
                </button>
              </div>
            )}
          </>
        ) : (
          <button onClick={handleLogin} className="btn btn-primary w-full" style={{ gap: "var(--space-2)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign in with Google
          </button>
        )}
      </div>
    </aside>
  );
}
