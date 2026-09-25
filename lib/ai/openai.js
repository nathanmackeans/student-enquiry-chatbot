// A thin wrapper around the OpenAI SDK. Keeping all AI calls in ONE file
// means that if we ever want to swap providers (e.g. use a different model),
// we only have to change this file, not every place that talks to the AI.

import OpenAI from "openai";

// Which models we use -- change these two lines to upgrade/downgrade cost
// vs. quality. text-embedding-3-small produces 1536-number vectors, which
// must match the "vector(1536)" column size in supabase/schema.sql.
// gpt-5-nano is OpenAI's cheapest/fastest chat-completion tier -- it's a
// reasoning model, so (unlike older models) it only supports the default
// temperature of 1; don't pass a custom `temperature` to it.
const EMBEDDING_MODEL = "text-embedding-3-small";
const CHAT_MODEL = "gpt-5-nano";

// Built lazily (only when a request actually needs it) rather than at
// import time. The OpenAI SDK throws immediately if the API key is missing,
// and constructing it at import time would crash the whole route module
// before our try/catch could turn that into a clean error response.
function getClient() {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Turns a piece of text (a student's question, or an FAQ) into a list of
// numbers ("an embedding") that captures its meaning. Similar questions end
// up with similar numbers, which is how we find relevant FAQs later.
export async function createEmbedding(text) {
  const response = await getClient().embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  });
  return response.data[0].embedding;
}

// Sends the conversation so far (plus retrieved knowledge-base context) to
// the language model and gets back the chatbot's reply as plain text.
export async function createChatReply(messages) {
  const response = await getClient().chat.completions.create({
    model: CHAT_MODEL,
    messages,
  });
  return response.choices[0].message.content;
}
