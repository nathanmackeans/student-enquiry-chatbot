-- ============================================================================
-- Student Enquiry Chatbot -- Schema v3: extended profile fields + feedback comment
-- ============================================================================
-- Run this AFTER schema.sql AND schema_v2_student_accounts.sql, once, in the
-- SQL Editor of the same Supabase project.
--
-- Adds the student profile attributes the project spec calls for
-- (department, programme, level, matriculation number), and an optional
-- free-text comment alongside each thumbs up/down rating.
-- ============================================================================

alter table profiles add column if not exists department text;
alter table profiles add column if not exists programme text;
alter table profiles add column if not exists level text;
alter table profiles add column if not exists matric_number text;

alter table feedback add column if not exists comment text;
alter table feedback add column if not exists user_id uuid references profiles (id) on delete set null;
