// Helper used by proxy.js (at the project root) to keep a login session
// alive across page navigations, and to redirect visitors away from pages
// their role isn't allowed to see.

import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Any logged-in account (student or admin) may view these. /chat is
// deliberately NOT in this list -- prospective students can chat without an
// account (see app/api/chat/route.js); only History/Profile, which need a
// real identity to mean anything, require login.
const STUDENT_PATH_PREFIXES = ["/history", "/profile"];
// Only accounts with role "admin" (see lib/auth/requireAdmin.js) may view these.
const ADMIN_PATH_PREFIX = "/admin";

function isStudentRoute(pathname) {
  return STUDENT_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function updateSession(request) {
  let response = NextResponse.next({ request });
  const pathname = request.nextUrl.pathname;

  // If Supabase hasn't been configured yet (.env.local missing/incomplete),
  // creating a client below would throw and take down EVERY route, not just
  // the protected ones. Fail safe instead: let public pages load, but still
  // block the protected pages with a clear message rather than a stack trace.
  const isConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!isConfigured) {
    if (pathname.startsWith(ADMIN_PATH_PREFIX) || isStudentRoute(pathname)) {
      return NextResponse.json(
        { error: "Supabase is not configured yet. Copy .env.local.example to .env.local and fill it in." },
        { status: 500 }
      );
    }
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: this call refreshes the session cookie if it's about to
  // expire. Skipping it would randomly log people out.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The account's role travels inside its own JWT (set once, when the
  // account is created -- see app/api/admin/users/route.js), so we can read
  // it here with no extra database round trip.
  const role = user?.user_metadata?.role;

  // Already logged in and trying to view the login page -- send them
  // straight to wherever they actually belong instead.
  if (pathname === "/login" && user) {
    const destination = request.nextUrl.clone();
    destination.pathname = role === "admin" ? "/admin/dashboard" : "/chat";
    return NextResponse.redirect(destination);
  }

  if (pathname.startsWith(ADMIN_PATH_PREFIX) && role !== "admin") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (isStudentRoute(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  return response;
}
