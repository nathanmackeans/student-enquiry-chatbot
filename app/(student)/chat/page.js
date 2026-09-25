// The student chat page. Works for BOTH prospective students (no account)
// and logged-in current students -- a server component that checks which
// one this visitor is, fetches the admin-set welcome message (see
// app/admin/settings/page.js), and hands both down to <ChatWidget />, where
// all the actual interactivity lives.

import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import ChatWidget from "@/components/ChatWidget";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/requireUser";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const user = await requireUser();
  const supabase = createAdminClient();
  const { data: settings } = await supabase
    .from("settings")
    .select("welcome_message")
    .eq("id", 1)
    .single();

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        Chat
      </Typography>

      {!user && (
        <Alert severity="info" sx={{ mb: 2 }}>
          You&apos;re chatting as a guest -- this conversation won&apos;t be
          saved. Log in with a student account to keep a History you can
          come back to.
        </Alert>
      )}

      <ChatWidget welcomeMessage={settings?.welcome_message} isAuthenticated={Boolean(user)} />
    </Container>
  );
}
