// A Supabase client for use INSIDE server components, server actions, and
// route handlers. It reads the admin's login session from cookies, so we can
// ask "is this visitor logged in as an admin?" It still only uses the public
// "publishable" key + Row Level Security, so it cannot read/write data on
// its own -- it is only used to check *who is logged in*, not to fetch
// chatbot data.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        // Next.js gives Supabase a way to read/write the auth cookies that
        // keep the admin logged in between page loads.
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll is called from a Server Component sometimes, where
            // cookies can't be written. Middleware (see proxy.js)
            // handles refreshing the session in that case, so this is safe
            // to ignore here.
          }
        },
      },
    }
  );
}
