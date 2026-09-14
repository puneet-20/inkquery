# InkQuery

A full-stack RAG (Retrieval-Augmented Generation) application that lets users upload a PDF and ask questions about it in natural language, getting answers grounded in the document's actual content.

## Status
✅ Deployed and live — see the demo link below.

## Live Demo
Try it here: **[https://inkquery-nine.vercel.app](https://inkquery-nine.vercel.app)**

Note: the backend runs on Render's free tier, so the first request after a period of inactivity may take 30-50 seconds to respond (cold start).

## Tech Stack
- **Frontend:** React (Vite)
- **Backend:** Node.js, Express
- **Database / Vector Store:** Supabase (Postgres + pgvector)
- **AI:** Google Gemini API (`gemini-embedding-001` for embeddings, `gemini-flash-latest` for chat) — free tier, no billing required
- **Auth:** Supabase Auth
- **Deployment:** Vercel (frontend), Render (backend)

## How it works
1. User uploads a PDF.
2. Backend extracts text and splits it into chunks.
3. Each chunk is converted into an embedding (vector) via Gemini and stored in Supabase (pgvector).
4. When a user asks a question, the question is embedded the same way.
5. Supabase finds the most semantically similar chunks to the question.
6. Those chunks + the question are sent to Gemini, which answers using only that context.

## Progress Log
- [x] Day 1: Repo setup, Supabase project, Express server skeleton, folder structure
- [x] Day 2: PDF upload + text extraction
- [x] Day 3: Chunking + embeddings + storage in Supabase
- [x] Day 4: Similarity search / retrieval
- [x] Day 5: Gemini answer generation + chat UI
- [x] Day 6: Auth + polish
- [x] Day 7: Deployment (backend on Render, frontend on Vercel) + Gemini 503 retry handling + database security hardening (RLS on all tables)

## Local Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env   # then fill in your real Supabase + Gemini keys
npm run dev
```

### Database
Run `backend/supabase_schema.sql` in your Supabase project's SQL Editor to set up tables, Row Level Security policies, and the vector search function.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # then fill in your Supabase + backend API URL
npm run dev
```

## Known Limitations
- Text chunking currently has no overlap between chunks, which can occasionally affect retrieval quality right at chunk boundaries
- No file size limit is currently enforced on PDF uploads
- Backend runs on Render's free tier, so it spins down when idle and the first request afterward is slow (cold start)

## Planned future improvements
- Multi-document support
- Smarter, sentence-aware chunking with overlap
- Streaming answers
- Result re-ranking