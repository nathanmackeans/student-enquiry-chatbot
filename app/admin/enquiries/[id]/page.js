// Read-only transcript of one conversation, for admins.

import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import ChatMessage from "@/components/ChatMessage";

export const dynamic = "force-dynamic";

export default async function AdminEnquiryDetailPage({ params }) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, created_at, profiles(full_name)")
    .eq("id", id)
    .single();

  if (conversationError || !conversation) notFound();

  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, sender, content")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true });
  if (messagesError) throw new Error(messagesError.message);

  return (
    <Container maxWidth="sm" sx={{ py: 4 }}>
      <Button href="/admin/enquiries" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
        Back to Enquiries
      </Button>
      <Typography variant="h5" component="h1">
        {conversation.profiles?.full_name || "Unknown student"}
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {new Date(conversation.created_at).toLocaleString()}
      </Typography>

      {messages.map((message) => (
        <ChatMessage key={message.id} sender={message.sender} content={message.content} />
      ))}
    </Container>
  );
}
