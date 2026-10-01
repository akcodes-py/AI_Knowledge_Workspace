"""
Auth Router — Google OAuth 2.0 + JWT
Endpoints:
  GET  /auth/login/google       → redirect to Google consent
  GET  /auth/callback/google    → exchange code, issue JWT, redirect
  GET  /auth/me                 → return current user (JWT required)
  POST /auth/logout             → client-side (just drop token)
"""
import os
import httpx
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from pydantic import BaseModel

from jose import jwt, JWTError
from dotenv import load_dotenv
from app.db.client import get_conn

load_dotenv()

router = APIRouter(prefix="/auth", tags=["auth"])

# ── env vars ──────────────────────────────────────────────
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
JWT_SECRET           = os.getenv("JWT_SECRET", "changeme-please-use-a-real-secret")
JWT_ALGORITHM        = "HS256"
JWT_EXPIRE_DAYS      = 30
FRONTEND_URL         = os.getenv("FRONTEND_URL", "http://localhost:3000")
BACKEND_URL          = os.getenv("BACKEND_URL", "http://localhost:8001")

GOOGLE_AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USER_URL  = "https://www.googleapis.com/oauth2/v2/userinfo"


# ── helpers ───────────────────────────────────────────────
def _make_jwt(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRE_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _decode_jwt(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")


def get_current_user(request: Request) -> dict:
    """FastAPI dependency — extract user from Bearer token or cookie."""
    token = None
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    if not token:
        token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return _decode_jwt(token)


def optional_user(request: Request) -> dict | None:
    """Like get_current_user but returns None if not authenticated."""
    try:
        return get_current_user(request)
    except HTTPException:
        return None


# ── routes ───────────────────────────────────────────────
@router.get("/login/google")
def login_google():
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Google OAuth not configured. Set GOOGLE_CLIENT_ID.")
    redirect_uri = f"{BACKEND_URL}/auth/callback/google"
    url = (
        f"{GOOGLE_AUTH_URL}?response_type=code"
        f"&client_id={GOOGLE_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=openid%20email%20profile"
        f"&access_type=offline"
    )
    return RedirectResponse(url)


@router.get("/callback/google")
async def callback_google(code: str, request: Request):
    redirect_uri = f"{BACKEND_URL}/auth/callback/google"
    async with httpx.AsyncClient() as client:
        # Exchange code for tokens
        tok_res = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        })
        if tok_res.status_code != 200:
            raise HTTPException(400, f"Google token exchange failed: {tok_res.text}")
        tok_data = tok_res.json()

        # Get user info
        user_res = await client.get(
            GOOGLE_USER_URL,
            headers={"Authorization": f"Bearer {tok_data['access_token']}"},
        )
        if user_res.status_code != 200:
            raise HTTPException(400, "Failed to fetch Google user info")
        guser = user_res.json()

    google_id = guser.get("id", "")
    email     = guser.get("email", "")
    name      = guser.get("name", email.split("@")[0])
    avatar    = guser.get("picture", "")

    # Upsert user in DB
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            INSERT INTO users (google_id, email, name, avatar_url, last_login)
            VALUES (%s, %s, %s, %s, now())
            ON CONFLICT (email) DO UPDATE SET
              google_id  = EXCLUDED.google_id,
              name       = EXCLUDED.name,
              avatar_url = EXCLUDED.avatar_url,
              last_login = now()
            RETURNING id::text
        """, (google_id, email, name, avatar))
        user_id = cur.fetchone()[0]
        conn.commit()

    token = _make_jwt(user_id, email)

    # Redirect to frontend with token in cookie
    response = RedirectResponse(url=f"{FRONTEND_URL}/?auth=ok")
    response.set_cookie(
        "access_token", token,
        max_age=JWT_EXPIRE_DAYS * 86400,
        httponly=True,
        samesite="lax",
        secure=False,   # set True in production with HTTPS
    )
    return response


@router.get("/me")
def me(user=Depends(get_current_user)):
    """Return current user from DB."""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id::text, email, name, avatar_url, created_at::text, last_login::text FROM users WHERE id = %s",
            (user["sub"],)
        )
        row = cur.fetchone()
    if not row:
        raise HTTPException(404, "User not found")
    return {
        "id": row[0], "email": row[1], "name": row[2],
        "avatar": row[3], "created_at": row[4], "last_login": row[5],
    }


@router.post("/logout")
def logout():
    response = JSONResponse({"ok": True})
    response.delete_cookie("access_token")
    return response


@router.get("/token-from-cookie")
def token_from_cookie(request: Request):
    """Allow frontend to retrieve JWT from httponly cookie as JSON (for localStorage)."""
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(401, "No token")
    payload = _decode_jwt(token)
    return {"token": token, "sub": payload["sub"], "email": payload["email"]}


class EmailLoginIn(BaseModel):
    email: str
    name: str | None = None


@router.post("/login/email")
def login_email(b: EmailLoginIn):
    """Sign in or auto-register using email address."""
    email = b.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Valid email address required")
    name = b.name.strip() if (b.name and b.name.strip()) else email.split("@")[0].capitalize()

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            INSERT INTO users (email, name, last_login)
            VALUES (%s, %s, now())
            ON CONFLICT (email) DO UPDATE SET
              name = COALESCE(NULLIF(users.name, ''), EXCLUDED.name),
              last_login = now()
            RETURNING id::text, avatar_url
        """, (email, name))
        row = cur.fetchone()
        user_id = row[0]
        avatar_url = row[1] or ""
        conn.commit()

    token = _make_jwt(user_id, email)
    response = JSONResponse({
        "token": token,
        "user": {
            "id": user_id,
            "email": email,
            "name": name,
            "avatar": avatar_url,
        }
    })
    response.set_cookie(
        "access_token", token,
        max_age=JWT_EXPIRE_DAYS * 86400,
        httponly=True,
        samesite="lax",
        secure=False,
    )
    return response

