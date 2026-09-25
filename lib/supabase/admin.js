// The "admin" Supabase client -- this is the ONE place in the whole project
// that uses the powerful SUPABASE_SECRET_KEY (Supabase's current name for
// what used to be called the "service_role" key -- older projects/docs may
// still show it under that name in the dashboard).
//
// The secret key bypasses Row Level Security completely, so it can read and
// write ANY row in the database. That is exactly what our backend needs to
// do (store chat messages, read/write FAQs, run analytics queries), but it
// must NEVER be sent to the browser.
//
// SAFETY RULE: only import this file from files that run on the server --
// route handlers (app/api/**/route.js) and server components. Never import
// it from a file that starts with "use client".

import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
      auth: {
        // This client is never used to log a real visitor in, so we turn
        // off session persistence/refresh -- it's a stateless service
        // account, not a user session.
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
