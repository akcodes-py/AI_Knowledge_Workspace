/**
 * Auth utilities — JWT storage, API fetch wrapper with auth headers
 */

const TOKEN_KEY = "aik_jwt";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  const t = getToken();
  if (!t) return false;
  try {
    const payload = JSON.parse(atob(t.split(".")[1]));
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function getUserFromToken(): { sub: string; email: string } | null {
  const t = getToken();
  if (!t) return null;
  try {
    const payload = JSON.parse(atob(t.split(".")[1]));
    return { sub: payload.sub, email: payload.email };
  } catch {
    return null;
  }
}

/** Authenticated fetch — adds Bearer token automatically */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(path, { ...options, headers });
}

/** After Google OAuth redirect, grab token from cookie via backend */
export async function exchangeCookieForToken(): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/token-from-cookie", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      if (data.token) {
        setToken(data.token);
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export function googleLoginUrl(): string {
  return "/api/auth/login/google";
}
