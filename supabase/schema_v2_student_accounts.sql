-- ============================================================================
-- Student Enquiry Chatbot -- Schema v2: student accounts, feedback, settings
-- ============================================================================
-- Run this AFTER supabase/schema.sql, once, in the SQL Editor of the SAME
-- Supabase project (Project Settings -> API should show the same URL as
-- NEXT_PUBLIC_SUPABASE_URL in your .env.local).
--
-- This adds:
--   - Real student + admin accounts (Supabase Auth), so students can log in
--     and see their chat History and a Profile page.
--   - A `profiles` table that mirrors each account's name/role for easy
--     querying (the ACTUAL access-control decision is made from the JWT's
--     user_metadata.role, set when the account is created -- see the note
--     at the bottom of this file about creating your first admin).
--   - Thumbs up/down feedback on bot replies.
--   - A single admin-editable `settings` row (institution name, welcome
--     message).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles: one row per Supabase Auth user (student OR admin).
-- ----------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'student' check (role in ('student', 'admin')),
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
-- conversations: now tied to the logged-in student who started it (chat now
-- requires login -- see proxy.js). The old free-text `student_identifier`
-- column is dead weight now that we have real accounts.
-- ----------------------------------------------------------------------------
alter table conversations drop column if exists student_identifier;

alter table conversations
  add column if not exists student_id uuid references profiles (id) on delete cascade;

create index if not exists conversations_student_id_idx on conversations (student_id);

-- ----------------------------------------------------------------------------
-- feedback: a thumbs up/down a student leaves on one bot reply. One rating
-- per message -- clicking the other thumb replaces it (see the unique index
-- + the "upsert" in app/api/feedback/route.js).
-- ----------------------------------------------------------------------------
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references messages (id) on delete cascade,
  rating text not null check (rating in ('up', 'down')),
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
-- Analytics helpers for the new dashboard stat cards / pages.
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

-- ----------------------------------------------------------------------------
-- Row Level Security: same "deny everything" pattern as schema.sql -- all
-- access goes through our API routes / server components using the
-- service-role (secret) key, which bypasses RLS entirely.
-- ----------------------------------------------------------------------------
alter table profiles enable row level security;
alter table feedback enable row level security;
alter table settings enable row level security;

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
