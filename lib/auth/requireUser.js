// A guard used at the top of student-facing API routes (chat, feedback).
// Any logged-in account (student or admin) counts -- this only answers
// "who is making this request?", not "are they allowed to do this?".

import { createClient } from "@/lib/supabase/server";

// Returns the logged-in user if there is one, or null otherwise. Callers
// should return a 401 response when this is null.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
