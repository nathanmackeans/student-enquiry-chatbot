// Next.js runs this file on EVERY request before it reaches a page or API
// route (this used to be called "middleware" -- Next 16 renamed the
// convention to "proxy", same behavior). We use it to gate every protected
// page: logged-out visitors get redirected to /login, and non-admins get
// bounced out of /admin/** -- see lib/supabase/middleware.js for the rules.

import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Run on every route EXCEPT static assets and image files, so we don't
    // waste time refreshing sessions for things like favicons.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
