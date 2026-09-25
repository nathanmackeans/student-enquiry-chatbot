// Shared layout for every student-facing page (/chat, /history, /profile).
// The route group folder name "(student)" doesn't appear in the URL -- it's
// just how Next.js lets us share one sidebar layout across those three
// routes without repeating it in each page.
//
// /history and /profile are already restricted to logged-in accounts by
// proxy.js. /chat is NOT -- prospective students can chat without an
// account -- so this layout checks the session itself and tells the
// sidebar which nav items make sense to show.

import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import StudentSidebar from "@/components/StudentSidebar";
import { requireUser } from "@/lib/auth/requireUser";

export default async function StudentLayout({ children }) {
  const user = await requireUser();

  return (
    <Box sx={{ display: "flex" }}>
      <StudentSidebar isAuthenticated={Boolean(user)} />
      <Box component="main" sx={{ flexGrow: 1, minHeight: "100vh", bgcolor: "background.default" }}>
        {/* Toolbar here is an invisible spacer matching the sidebar's own
            Toolbar height, so page content doesn't start underneath it. */}
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
