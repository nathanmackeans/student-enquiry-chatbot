// Retrieval-Augmented Generation (RAG): before asking the language model to
// answer a question, we first look up the most relevant entries in our own
// knowledge base (the "faqs" table). We then hand those to the model as
// context, so it answers using OUR approved information instead of
// guessing from its general training data.

import { createEmbedding } from "./openai";

const MATCH_COUNT = 4; // how many FAQ entries to retrieve per question

// How similar (0-1 cosine similarity) a match must be to count. This is
// LOWER than it looks like it should be -- text-embedding-3-small scores
// genuinely relevant-but-differently-worded Q&A pairs around 0.35-0.55, not
// 0.8+ (that range is closer to near-duplicate phrasing). Verified against
// real seeded data: unrelated questions scored under 0.1, while relevant
// ones scored 0.33-0.50, so 0.3 cleanly separates the two.
const MATCH_THRESHOLD = 0.3;

// Looks up the FAQ entries whose meaning is closest to the student's
// question, using Postgres + pgvector (via the match_faqs() SQL function
// defined in supabase/schema.sql).
export async function retrieveRelevantFaqs(supabaseAdmin, question) {
  const questionEmbedding = await createEmbedding(question);

  const { data, error } = await supabaseAdmin.rpc("match_faqs", {
    query_embedding: questionEmbedding,
    match_threshold: MATCH_THRESHOLD,
    match_count: MATCH_COUNT,
  });

  if (error) {
    throw new Error(`RAG lookup failed: ${error.message}`);
  }

  return data; // array of { id, question, answer, category, similarity }
}

// Turns the retrieved FAQ rows into a single block of text we can paste
// into the system prompt, so the model has the approved facts in front of
// it while it writes its reply.
export function buildContextBlock(faqs) {
  if (!faqs || faqs.length === 0) {
    return "No matching information was found in the knowledge base.";
  }

  return faqs
    .map(
      (faq, index) =>
        `${index + 1}. Q: ${faq.question}\n   A: ${faq.answer}`
    )
    .join("\n\n");
}
