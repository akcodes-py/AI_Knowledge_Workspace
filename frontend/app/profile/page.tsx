"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../Sidebar";
import ThemeToggle from "../ThemeToggle";
import { apiFetch, isLoggedIn, clearToken } from "../lib/auth";

interface UserInfo {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  created_at: string;
  last_login: string;
}

interface DocItem {
  id: string;
  filename: string;
  type: string;
  status: string;
  created: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/");
      return;
    }
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [userRes, docsRes] = await Promise.all([
        apiFetch("/api/auth/me"),
        apiFetch("/api/documents/"),
      ]);
      if (userRes.ok) setUser(await userRes.json());
      if (docsRes.ok) setDocs(await docsRes.json());
    } catch {}
    setLoading(false);
  }

  async function deleteDoc(docId: string) {
    setDeleting(docId);
    try {
      await apiFetch(`/api/documents/${docId}`, { method: "DELETE" });
      setDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch {}
    setDeleting(null);
  }

  function handleSignOut() {
    clearToken();
    fetch("/api/auth/logout", { method: "POST", credentials: "include" }).catch(() => {});
    router.push("/");
  }

  if (loading) {
    return (
      <div className="app-shell">
        <Sidebar />
        <main className="main-content flex items-center justify-center">
          <div className="loader" style={{ width: "40px", height: "40px", borderWidth: "4px" }} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <div className="page-header flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="page-title">Profile & Account</h1>
            <p className="page-subtitle">Manage your account, documents, and preferences</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="bento-grid">
          {/* Profile Card */}
          <div className="bento-col-4 glass-card glass-blue">
            {user ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)", textAlign: "center" }}>
                {user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar}
                    alt={user.name}
                    style={{
                      width: "80px", height: "80px", borderRadius: "50%",
                      border: "3px solid rgba(59,130,246,0.6)",
                      boxShadow: "var(--glow-blue)",
                    }}
                  />
                ) : (
                  <div style={{
                    width: "80px", height: "80px", borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--neon-blue), var(--neon-purple))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "2rem", fontWeight: 800, color: "#fff",
                    boxShadow: "var(--glow-blue)",
                  }}>
                    {user.name?.charAt(0)?.toUpperCase()}
                  </div>
                )}

                <div>
                  <div style={{ fontSize: "var(--fs-lg)", fontWeight: 800, color: "var(--text-white)", marginBottom: "var(--space-1)" }}>
                    {user.name}
                  </div>
                  <div className="text-secondary text-sm">{user.email}</div>
                </div>

                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {[
                    { label: "Account Created", value: new Date(user.created_at).toLocaleDateString() },
                    { label: "Last Login", value: new Date(user.last_login).toLocaleString() },
                    { label: "Documents", value: String(docs.length) },
                  ].map((item) => (
                    <div key={item.label} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "var(--space-2) var(--space-3)",
                      background: "rgba(0,0,0,0.2)",
                      borderRadius: "var(--radius-xs)",
                      border: "1px solid var(--glass-border)",
                    }}>
                      <span className="text-muted text-xs uppercase" style={{ letterSpacing: "0.6px" }}>{item.label}</span>
                      <span style={{ fontSize: "var(--fs-sm)", fontWeight: 700, color: "var(--text-primary)" }}>{item.value}</span>
                    </div>
                  ))}
                </div>

                <button onClick={handleSignOut} className="btn btn-danger w-full">
                  🚪 Sign Out
                </button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-muted">Not logged in.</p>
                <button onClick={() => window.location.href = "/api/auth/login/google"} className="btn btn-google mt-4">
                  Sign in with Google
                </button>
              </div>
            )}
          </div>

          {/* Documents Management */}
          <div className="bento-col-8 glass-card">
            <div className="flex justify-between items-center mb-5">
              <div className="section-title" style={{ margin: 0 }}>
                <span>📁</span>
                <span>My Documents ({docs.length})</span>
              </div>
              <button onClick={loadData} className="btn btn-ghost btn-sm">🔄 Refresh</button>
            </div>

            {docs.length === 0 ? (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", padding: "var(--space-8)",
                background: "rgba(0,0,0,0.2)", borderRadius: "var(--radius)",
                border: "1px dashed var(--glass-border)",
              }}>
                <div style={{ fontSize: "3rem", marginBottom: "var(--space-3)" }}>📭</div>
                <p className="text-secondary text-sm">No documents indexed yet.</p>
                <p className="text-muted text-xs">Upload PDFs, YouTube videos, or code repos from the home page.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", maxHeight: "500px", overflowY: "auto" }}>
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      padding: "var(--space-3) var(--space-4)",
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid var(--glass-border)",
                      borderRadius: "var(--radius-sm)",
                      transition: "background 0.2s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flex: 1, overflow: "hidden" }}>
                      <span style={{ fontSize: "1.2rem" }}>
                        {doc.type === "youtube" ? "🎬" : doc.type === "code" ? "💻" : "📄"}
                      </span>
                      <div style={{ overflow: "hidden" }}>
                        <div className="truncate text-sm" style={{ fontWeight: 600, color: "var(--text-primary)", maxWidth: "300px" }}>
                          {doc.filename}
                        </div>
                        <div className="text-muted" style={{ fontSize: "0.7rem" }}>
                          {new Date(doc.created).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 items-center" style={{ flexShrink: 0 }}>
                      <span className={`badge ${doc.status === "ready" ? "badge-green" : doc.status === "processing" ? "badge-gold" : "badge-rose"}`}>
                        {doc.status}
                      </span>
                      <span className="badge badge-muted">{doc.type}</span>
                      <button
                        onClick={() => deleteDoc(doc.id)}
                        disabled={deleting === doc.id}
                        className="btn btn-ghost btn-sm"
                        style={{ color: "#f87171", padding: "0.25rem 0.5rem" }}
                        title="Delete document"
                      >
                        {deleting === doc.id ? <div className="loader loader-sm" /> : "🗑️"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
