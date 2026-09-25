// POST /api/chat
// This is the heart of the chatbot. A student's message comes in here, and
// a reply goes out. Along the way we:
//   1. Save the student's message.
//   2. Categorise it (for the analytics dashboard).
//   3. Retrieve relevant knowledge-base entries (RAG).
//   4. Ask the language model for a reply, giving it the retrieved facts
//      AND the recent conversation history (so follow-up questions like
//      "what about the deadline?" make sense -- this is the "context-aware"
//      part of the spec).
//   5. Save the bot's reply and send it back to the browser.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createChatReply } from "@/lib/ai/openai";
import { retrieveRelevantFaqs, buildContextBlock } from "@/lib/ai/rag";
import { categoriseEnquiry } from "@/lib/ai/classify";
import { requireUser } from "@/lib/auth/requireUser";

// How many previous messages to include as conversation history/context.
// Keeping this small keeps replies fast and keeps API costs down.
const HISTORY_LENGTH = 6;

const SYSTEM_PROMPT_TEMPLATE = (institutionName, contextBlock) => `You are the student enquiry assistant for ${institutionName}.
Answer ONLY using the information in the "Knowledge base" section below.
If the knowledge base does not contain the answer, say clearly that you
don't have that information yet and suggest the student contact the
administration office -- do NOT make up an answer.
Keep answers short, friendly, and specific.

Knowledge base:
${contextBlock}`;

export async function POST(request) {
  try {
    // Chat works for BOTH prospective students (no account -- their
    // conversation is anonymous and won't appear in any History page) and
    // logged-in current students (conversation tied to their account, shows
    // up in their History). `user` is simply null for the former.
    const user = await requireUser();

    const { conversationId, message } = await request.json();

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "A non-empty 'message' is required." },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Step 1: make sure we have a conversation row to attach messages to. If
    // logged in, it's tied to the student so it shows up in their History;
    // if anonymous, student_id is just null. If the browser didn't send a
    // conversation id yet (this is the first message), create one now.
    let activeConversationId = conversationId;
    if (!activeConversationId) {
      const { data: newConversation, error: conversationError } = await supabase
        .from("conversations")
        .insert({ student_id: user?.id ?? null })
        .select("id")
        .single();

      if (conversationError) throw conversationError;
      activeConversationId = newConversation.id;
    }

    // Step 2: work out which topic this enquiry falls under, then save the
    // student's message.
    const category = categoriseEnquiry(message);

    const { error: saveStudentMessageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        sender: "student",
        content: message,
        category,
      });
    if (saveStudentMessageError) throw saveStudentMessageError;

    // Step 3: Retrieval-Augmented Generation -- look up the FAQ entries
    // whose meaning is closest to this question.
    const relevantFaqs = await retrieveRelevantFaqs(supabase, message);
    const contextBlock = buildContextBlock(relevantFaqs);

    // The institution name is admin-editable (see app/admin/settings/page.js)
    // rather than hard-coded, so this same codebase can be reused for a
    // different institution without touching source code.
    const { data: settings } = await supabase
      .from("settings")
      .select("institution_name")
      .eq("id", 1)
      .single();
    const institutionName = settings?.institution_name || "this institution";

    // Step 4: pull the recent conversation history for context, so
    // follow-up questions ("what about the deadline?") are understood
    // correctly using what was asked before.
    const { data: recentMessages, error: historyError } = await supabase
      .from("messages")
      .select("sender, content")
      .eq("conversation_id", activeConversationId)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LENGTH);
    if (historyError) throw historyError;

    // Messages came back newest-first; put them back in chronological order,
    // and translate our 'student' / 'bot' labels into what the OpenAI API
    // expects ('user' / 'assistant').
    const conversationHistory = recentMessages
      .reverse()
      .map((m) => ({
        role: m.sender === "student" ? "user" : "assistant",
        content: m.content,
      }));

    const chatMessages = [
      { role: "system", content: SYSTEM_PROMPT_TEMPLATE(institutionName, contextBlock) },
      ...conversationHistory,
    ];

    const reply = await createChatReply(chatMessages);

    // Step 5: save the bot's reply (capturing its id so the browser can
    // attach thumbs up/down feedback to this exact message -- see
    // app/api/feedback/route.js), then send everything back.
    const { data: botMessage, error: saveBotMessageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: activeConversationId,
        sender: "bot",
        content: reply,
      })
      .select("id")
      .single();
    if (saveBotMessageError) throw saveBotMessageError;

    return NextResponse.json({
      conversationId: activeConversationId,
      reply,
      replyMessageId: botMessage.id,
    });
  } catch (error) {
    console.error("POST /api/chat failed:", error);
    return NextResponse.json(
      { error: "Something went wrong answering that question. Please try again." },
      { status: 500 }
    );
  }
}
