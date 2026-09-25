// A guard used at the top of admin-only API routes (see app/api/faqs/route.js,
// app/api/admin/**/route.js).
//
// proxy.js already stops logged-out (or non-admin) visitors from loading the
// /admin/** PAGES, but that does not protect the underlying API routes
// themselves -- someone could still send requests straight to them. This
// function closes that gap by checking, on the server, that the request
// carries a session belonging to an ADMIN specifically -- not just any
// logged-in user (now that students are real accounts too, "logged in" is
// no longer the same thing as "admin").

import { createClient } from "@/lib/supabase/server";

// Returns the logged-in admin user if there is one, or null otherwise.
// Callers should return a 401/403 response when this is null.
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.user_metadata?.role !== "admin") {
    return null;
  }
  return user;
}
