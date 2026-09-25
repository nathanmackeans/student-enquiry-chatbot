// Lists the logged-in student's own past conversations. A server component
// -- it fetches directly (no API route needed, since this is read-only and
// only ever needs the current student's own data).

import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Chip from "@mui/material/Chip";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await requireUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const { data: conversations, error } = await supabase
    .from("conversations")
    .select("id, created_at, messages(content, sender, category)")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Typography variant="h5" component="h1" gutterBottom>
        History
      </Typography>

      {conversations.length === 0 ? (
        <Typography color="text.secondary">
          No past conversations yet -- start a chat to see it here.
        </Typography>
      ) : (
        <Stack spacing={2}>
          {conversations.map((conversation) => {
            const firstQuestion = conversation.messages.find((m) => m.sender === "student");
            const category = firstQuestion?.category;
            return (
              <Paper
                key={conversation.id}
                variant="outlined"
                component="a"
                href={`/history/${conversation.id}`}
                sx={{
                  p: 2,
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                <Typography fontWeight={600} noWrap>
                  {firstQuestion?.content || "Empty conversation"}
                </Typography>
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 0.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(conversation.created_at).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    · {conversation.messages.length} messages
                  </Typography>
                  {category && <Chip label={category} size="small" variant="outlined" />}
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      )}
    </Container>
  );
}
