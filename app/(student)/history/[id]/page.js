// A read-only transcript of one past conversation. Verifies the
// conversation actually belongs to the logged-in student before showing
// anything -- otherwise a student could view another student's chat just by
// guessing/changing the id in the URL.

import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/requireUser";
import { createAdminClient } from "@/lib/supabase/admin";
import ChatMessage from "@/components/ChatMessage";

export const dynamic = "force-dynamic";

export default async function HistoryDetailPage({ params }) {
  const { id } = await params;
  const user = await requireUser();
  if (!user) redirect("/login");

  const supabase = createAdminClient();
  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, student_id")
    .eq("id", id)
    .single();

  if (conversationError || !conversation || conversation.student_id !== user.id) {
    notFound();
  }

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, sender, content")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });
  if (messagesError) throw new Error(messagesError.message);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Button href="/history" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Back to History
      </Button>
      <Typography variant="h5" component="h1" gutterBottom>
        Conversation
      </Typography>

      {messages.map((message) => (
        <ChatMessage key={message.id} sender={message.sender} content={message.content} />
      ))}
    </Container>
  );
}
