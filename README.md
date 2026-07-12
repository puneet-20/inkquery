# InkQuery

A full-stack RAG (Retrieval-Augmented Generation) application that lets users upload a PDF and ask questions about it in natural language, getting answers grounded in the document's actual content.

## Status
🚧 In progress — building day by day. See progress log below.

## Tech Stack
- **Frontend:** React (Vite)
- **Backend:** Node.js, Express
- **Database / Vector Store:** Supabase (Postgres + pgvector)
- **AI:** Google Gemini API (`text-embedding-004` for embeddings, `gemini-1.5-flash` for chat) — free tier, no billing required
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
- [x] Day 5: GPT answer generation + chat UI
- [ ] Day 6: Auth + polish
- [ ] Day 7: Deployment

## Local Setup

### Backend
```bash
cd backend
npm install
cp .env.example .env   # then fill in your real Supabase + Gemini keys
npm run dev
```
Visit `http://localhost:5000/health` to confirm it's running.

### Database
Run `backend/supabase_schema.sql` in your Supabase project's SQL Editor to set up tables and the vector search function.

## Planned future improvements
- Multi-document support
- Smarter, sentence-aware chunking
- Streaming answers
- Result re-ranking
