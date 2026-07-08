-- Run this in Supabase Dashboard -> SQL Editor -> New Query

-- 1. Enable the pgvector extension (lets Postgres store & search embedding vectors)
create extension if not exists vector;

-- 2. Table to store uploaded documents
create table documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  filename text not null,
  created_at timestamp with time zone default now()
);

-- 3. Table to store text chunks + their embeddings
-- text-embedding-3-small produces vectors of size 1536
create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references documents(id) on delete cascade not null,
  content text not null,
  embedding vector(1536),
  created_at timestamp with time zone default now()
);

-- 4. Function to search for the most similar chunks to a given question embedding
create or replace function match_chunks (
  query_embedding vector(1536),
  match_document_id uuid,
  match_count int default 5
)
returns table (
  id uuid,
  content text,
  similarity float
)
language sql stable
as $$
  select
    chunks.id,
    chunks.content,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from chunks
  where chunks.document_id = match_document_id
  order by chunks.embedding <=> query_embedding
  limit match_count;
$$;

-- 5. Row Level Security so users can only see their own documents
alter table documents enable row level security;
create policy "Users can view their own documents"
  on documents for select
  using (auth.uid() = user_id);
create policy "Users can insert their own documents"
  on documents for insert
  with check (auth.uid() = user_id);
