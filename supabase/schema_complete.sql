-- ============================================================================
-- Student Enquiry Chatbot -- Complete database schema (v1 + v2 + v3 combined)
-- ============================================================================
-- HOW TO USE THIS FILE:
--   1. Open your Supabase project -> SQL Editor -> New query.
--   2. Paste this whole file in and click "Run".
-- This is the same schema as running schema.sql, then
-- schema_v2_student_accounts.sql, then
-- schema_v3_profile_fields_and_feedback_comment.sql, in that order -- just
-- combined into one file so you only need one trip to the SQL Editor.
-- Safe to run once on a fresh project (every statement is idempotent:
-- "if not exists" / "or replace" throughout).
-- ============================================================================


-- ============================================================================
-- PART 1 (was schema.sql): conversations, messages, knowledge base (FAQs)
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


-- ============================================================================
-- PART 2 (was schema_v2_student_accounts.sql): student accounts, feedback,
-- settings
-- ============================================================================
-- Adds real student + admin accounts (Supabase Auth), so students can log in
-- and see their chat History and a Profile page; thumbs up/down feedback on
-- bot replies; and a single admin-editable `settings` row.
--
-- The ACTUAL access-control decision (student vs admin) is made from the
-- JWT's user_metadata.role, set when the account is created -- see the note
-- at the bottom of this file about creating your first admin. `profiles` is
-- a convenient mirror of that, used for querying/joining.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles: one row per Supabase Auth user (student OR admin).
-- ----------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student', 'admin')),
  -- Extended academic fields (set by an admin when creating a student
  -- account -- see app/api/admin/users/route.js and /admin/users).
  department text,
  programme text,
  level text,
  matric_number text,
  created_at timestamptz not null default now()
);

-- Whenever a new account is created (see app/api/admin/users/route.js), copy
-- the name/role we set in its metadata into `profiles`, so the rest of the
-- app can query/join on a plain table instead of calling the Auth admin API
-- every time it needs a student's name.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'role', 'student')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ----------------------------------------------------------------------------
-- conversations: tied to the logged-in student who started it, when there is
-- one. Chat also works for anonymous "prospective student" visitors with no
-- account (see app/api/chat/route.js) -- for them, student_id is just null.
-- ----------------------------------------------------------------------------
alter table conversations
  add column if not exists student_id uuid references profiles (id) on delete cascade;

create index if not exists conversations_student_id_idx on conversations (student_id);

-- ----------------------------------------------------------------------------
-- feedback: a thumbs up/down (with an optional comment) a student leaves on
-- one bot reply. One rating per message -- clicking the other thumb replaces
-- it (see the unique index + the "upsert" in app/api/feedback/route.js).
-- ----------------------------------------------------------------------------
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages (id) on delete cascade,
  rating text not null check (rating in ('up', 'down')),
  comment text,
  user_id uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists feedback_message_id_key on feedback (message_id);

create or replace function get_feedback_counts ()
returns table (rating text, total bigint)
language sql stable
as $$
  select feedback.rating, count(*) as total
  from feedback
  group by feedback.rating;
$$;

-- ----------------------------------------------------------------------------
-- settings: a single row of admin-editable, app-wide settings.
-- ----------------------------------------------------------------------------
create table if not exists settings (
  id int primary key default 1 check (id = 1), -- enforces exactly one row
  institution_name text not null default 'Delta State University',
  welcome_message text not null default 'Hi! I''m the DELSU student enquiry assistant. Ask me about admissions, fees, deadlines, registration, or results.',
  updated_at timestamptz not null default now()
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- Analytics helpers for the dashboard stat cards / admin pages.
-- ----------------------------------------------------------------------------

-- "Active Users" stat card: distinct students who've chatted in the window.
create or replace function get_active_student_count (days_back int)
returns bigint
language sql stable
as $$
  select count(distinct student_id)
  from conversations
  where student_id is not null
    and created_at >= now() - (days_back || ' days')::interval;
$$;

-- Powers the admin Enquiries list: one row per conversation, with the
-- student's name and how many messages it contains, newest first.
create or replace function get_recent_conversations (limit_count int default 50)
returns table (
  id uuid,
  student_name text,
  created_at timestamptz,
  message_count bigint
)
language sql stable
as $$
  select
    c.id,
    coalesce(p.full_name, 'Unknown student') as student_name,
    c.created_at,
    count(m.id) as message_count
  from conversations c
  left join profiles p on p.id = c.student_id
  left join messages m on m.conversation_id = c.id
  group by c.id, p.full_name, c.created_at
  order by c.created_at desc
  limit limit_count;
$$;


-- ============================================================================
-- Row Level Security: "deny everything" -- all access goes through our API
-- routes / server components using the service-role (secret) key, which
-- bypasses RLS entirely. This is a safety net in case the publishable key is
-- ever used against these tables directly by mistake.
-- ============================================================================
alter table conversations enable row level security;
alter table messages enable row level security;
alter table faqs enable row level security;
alter table profiles enable row level security;
alter table feedback enable row level security;
alter table settings enable row level security;
-- (No policies are created, which means: no access at all for anon/authenticated.)


-- ============================================================================
-- ONE-TIME MANUAL STEP: create your first admin account
-- ============================================================================
-- New accounts are normally created through the app itself (log in as an
-- admin, go to /admin/users, click "Add user"). But that page requires you
-- to already be logged in as an admin -- so the very first one has to be
-- created by hand:
--
--   1. Supabase dashboard -> Authentication -> Users -> Add user.
--      Set an email + password, and tick "Auto confirm user".
--   2. Run this (with that email) in the SQL Editor:
--
--      update auth.users
--      set raw_user_meta_data = raw_user_meta_data || '{"role":"admin","full_name":"Admin"}'::jsonb
--      where email = 'YOUR-ADMIN-EMAIL-HERE';
--
--      update public.profiles
--      set role = 'admin', full_name = 'Admin'
--      where id = (select id from auth.users where email = 'YOUR-ADMIN-EMAIL-HERE');
--
-- Why both statements: access control reads the role from the user's login
-- session (which comes from auth.users.raw_user_meta_data), while `profiles`
-- is just a convenient copy used for displaying names/joining tables -- so
-- both need to agree.
-- ============================================================================
