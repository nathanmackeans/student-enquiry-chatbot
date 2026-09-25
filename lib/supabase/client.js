// This file creates a Supabase client that is safe to use in the BROWSER
// (inside React components that run on the client, e.g. the admin login form).
//
// It only ever uses the "publishable" key (Supabase's current name for what
// used to be called the "anon" key) -- public and safe to expose to
// visitors, since it can only do what our Row Level Security (RLS) policies
// allow. We never put the powerful "secret" key here.

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );
}
