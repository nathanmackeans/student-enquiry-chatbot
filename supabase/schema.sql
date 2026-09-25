-- ============================================================================
-- Student Enquiry Chatbot -- Supabase database schema
-- ============================================================================
-- HOW TO USE THIS FILE:
--   1. Open your Supabase project -> SQL Editor -> New query.
--   2. Paste this whole file in and click "Run".
-- It is safe to run once on a fresh project. It creates every table,
-- index, and function the app needs.
-- ============================================================================

-- pgvector lets Postgres store "embeddings" (lists of numbers that capture
-- the MEANING of a sentence) and search them by similarity. This is what
-- powers Retrieval-Augmented Generation (RAG) -- see lib/ai/rag.js.
create extension if not exists vector;

-- ----------------------------------------------------------------------------
-- conversations: one row per chat session between a student and the bot.
-- ----------------------------------------------------------------------------
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  -- Optional free-text label (e.g. a name/email the student typed in) --
  -- we do NOT require students to log in, so this can be null.
  student_identifier text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- messages: every individual message in every conversation, in order.
-- ----------------------------------------------------------------------------
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  -- 'student' = the question that was typed in, 'bot' = our reply.
  sender text not null check (sender in ('student', 'bot')),
  content text not null,
  -- Only set on 'student' messages -- which topic the enquiry falls under.
  -- Used by the analytics dashboard to show "most common enquiry types".
  category text,
  created_at timestamptz not null default now()
);

-- Speeds up "give me all messages for this conversation, oldest first".
create index if not exists messages_conversation_id_created_at_idx
  on messages (conversation_id, created_at);

-- Speeds up the analytics dashboard's "count enquiries per category" query.
create index if not exists messages_category_idx on messages (category);

-- ----------------------------------------------------------------------------
-- faqs: the knowledge base. This is the ONLY source of truth the chatbot is
-- allowed to answer from (see the system prompt in app/api/chat/route.js).
-- ----------------------------------------------------------------------------
create table if not exists faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  -- The embedding of `question` (and often `answer` too), produced by
  -- OpenAI's text-embedding-3-small model, which returns 1536 numbers.
  -- If you change EMBEDDING_MODEL in lib/ai/openai.js, update this size too.
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Makes similarity search over `embedding` fast even with many FAQs.
-- ivfflat needs at least ~1000 rows to really pay off, but it's harmless
-- to create early -- Postgres will just do a full scan until then.
create index if not exists faqs_embedding_idx
  on faqs using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ----------------------------------------------------------------------------
-- match_faqs: the SQL function our RAG step calls to find the FAQs whose
-- MEANING is closest to the student's question (cosine similarity search).
-- ----------------------------------------------------------------------------
create or replace function match_faqs (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id uuid,
  question text,
  answer text,
  category text,
  similarity float
)
language sql stable
as $$
  select
    faqs.id,
    faqs.question,
    faqs.answer,
    faqs.category,
    -- Cosine similarity: 1 = identical meaning, 0 = unrelated.
    -- pgvector's `<=>` operator returns cosine DISTANCE, so we do 1 - distance.
    1 - (faqs.embedding <=> query_embedding) as similarity
  from faqs
  where faqs.embedding is not null
    and 1 - (faqs.embedding <=> query_embedding) > match_threshold
  order by faqs.embedding <=> query_embedding
  limit match_count;
$$;

-- ----------------------------------------------------------------------------
-- get_category_counts: powers the "enquiries by category" chart.
-- ----------------------------------------------------------------------------
create or replace function get_category_counts ()
returns table (category text, total bigint)
language sql stable
as $$
  select coalesce(category, 'general') as category, count(*) as total
  from messages
  where sender = 'student'
  group by coalesce(category, 'general')
  order by total desc;
$$;

-- ----------------------------------------------------------------------------
-- get_daily_enquiry_counts: powers the "enquiry volume over time" chart.
-- ----------------------------------------------------------------------------
create or replace function get_daily_enquiry_counts (days_back int)
returns table (day date, total bigint)
language sql stable
as $$
  select
    date_trunc('day', created_at)::date as day,
    count(*) as total
  from messages
  where sender = 'student'
    and created_at >= now() - (days_back || ' days')::interval
  group by day
  order by day;
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security (RLS)
-- ----------------------------------------------------------------------------
-- All application reads/writes go through Next.js API routes using the
-- SERVICE ROLE key (see lib/supabase/admin.js), which bypasses RLS entirely.
-- The browser never talks to these tables directly. So we lock RLS down to
-- "deny everything" -- this is a safety net in case the anon/public key is
-- ever used against these tables by mistake.
alter table conversations enable row level security;
alter table messages enable row level security;
alter table faqs enable row level security;
-- (No policies are created, which means: no access at all for anon/authenticated.)
