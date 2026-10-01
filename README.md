# 🧠 AI Knowledge Workspace v2

> **Dark-mode AI learning hub** — Upload anything, understand everything, ask anything.  
> Powered by **Gemini 2.0 Flash**, **LangGraph RAG**, **JWT + Google OAuth**, and a premium glassmorphism UI.

[![GitHub](https://img.shields.io/badge/GitHub-akcodes--py-blue)](https://github.com/akcodes-py/AI_Knowledge_Workspace)

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔒 **Google OAuth + JWT** | Sign in with Gmail, JWT tokens, secure per-user data |
| ⚡ **Async Ingestion** | Upload returns instantly; chunking/embedding happens in background |
| 🧠 **LangGraph RAG** | Rewrite → Retrieve → Rerank → Generate pipeline |
| 📄 **Multi-format** | PDF, DOCX, PPTX, TXT, MD, ZIP, PNG, JPG, MP3, WAV |
| 🎬 **YouTube** | Auto-transcribe & index any YouTube lecture |
| 💬 **AI Chat Assistant** | ChatGPT-like UI with session history, citations, typing indicator |
| 📚 **Notes & Flashcards** | AI-generated summaries, flashcard decks, exam questions |
| 🔬 **Knowledge Graphs** | Semantic graphs, Mermaid diagrams, contradiction detection |
| 🎯 **Adaptive Quiz** | MCQ/MSQ/TF with weak-topic remediation |
| 🚀 **Gemini Caching** | LRU + Gemini context caching for sub-second repeat queries |
| 🔧 **Nginx Proxy** | Hides backend port, production-ready |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL 15+
- Nginx (optional, for production)

### 1. Clone
```bash
git clone https://github.com/akcodes-py/AI_Knowledge_Workspace
cd AI_Knowledge_Workspace
```

### 2. Database Setup
```bash
psql -U postgres -c "CREATE DATABASE ai_workspace;"
psql -U postgres -d ai_workspace -f backend/app/db/schema.sql
```

### 3. Backend
```bash
cd backend
cp .env.example .env   # Fill in GEMINI_API_KEY, GOOGLE_CLIENT_ID, etc.
pip install -r requirements.txt
uvicorn app.main:app --port 8001 --reload
```

### 4. Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:3000

### 5. Nginx (Production)
```bash
sudo cp nginx/ai-workspace.conf /etc/nginx/sites-available/ai-workspace
sudo ln -s /etc/nginx/sites-available/ai-workspace /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🔑 Environment Variables

```env
# backend/.env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_workspace
EMBED_MODEL=all-MiniLM-L6-v2
BACKEND_PORT=8001

# Google OAuth (console.cloud.google.com)
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
JWT_SECRET=your-random-32-char-secret

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8001
```

### Getting Google OAuth credentials:
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → Enable "Google+ API" / "Google Identity"
3. Credentials → OAuth 2.0 Client ID → Web Application
4. Authorized redirect URIs: `http://localhost:8001/auth/callback/google`

---

## 🏗️ Architecture

```
┌─────────────┐     Nginx      ┌──────────────┐
│   Browser   │ ──────────────▶│   :80/443    │
└─────────────┘                └──────┬───────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                   │
             ┌────────────┐    ┌─────────────┐            │
             │  Next.js   │    │  FastAPI    │            │
             │  :3000     │    │  :8001      │            │
             └────────────┘    └──────┬──────┘            │
                                      │                    │
                         ┌────────────┼──────────┐        │
                         ▼            ▼          ▼        │
                    ┌─────────┐  ┌────────┐  ┌──────┐    │
                    │Postgres │  │Gemini  │  │Local │    │
                    │(chunks  │  │2.0Flash│  │Embed │    │
                    │ + users)│  │  API   │  │Model │    │
                    └─────────┘  └────────┘  └──────┘    │
```

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/auth/login/google` | Redirect to Google OAuth |
| GET | `/auth/me` | Current user info (JWT required) |
| POST | `/documents/upload-file` | Upload file (returns instantly) |
| POST | `/documents/youtube` | Index YouTube video |
| GET | `/documents/` | List user's documents |
| GET | `/documents/{id}/status` | Poll ingestion status |
| POST | `/chat/send` | RAG chat + persist history |
| GET | `/chat/history` | Load conversation history |
| POST | `/quiz/` | Generate adaptive quiz |
| POST | `/notes/summarize` | AI exam summary |
| POST | `/notes/flashcards` | Flashcard deck |

---

## 📄 License
MIT © [Atul Kumar (akcodes-py)](https://github.com/akcodes-py)
