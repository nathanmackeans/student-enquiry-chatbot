import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildContextBlock } from "./rag";

describe("buildContextBlock", () => {
  it("returns a clear 'no match' message when there are no FAQs", () => {
    expect(buildContextBlock([])).toBe("No matching information was found in the knowledge base.");
    expect(buildContextBlock(null)).toBe("No matching information was found in the knowledge base.");
    expect(buildContextBlock(undefined)).toBe("No matching information was found in the knowledge base.");
  });

  it("formats a single FAQ as a numbered Q/A pair", () => {
    const block = buildContextBlock([
      { question: "What are the admission requirements?", answer: "Five O'Level credits." },
    ]);
    expect(block).toBe("1. Q: What are the admission requirements?\n   A: Five O'Level credits.");
  });

  it("numbers multiple FAQs in order and separates them with a blank line", () => {
    const block = buildContextBlock([
      { question: "Q1?", answer: "A1." },
      { question: "Q2?", answer: "A2." },
    ]);
    expect(block).toBe("1. Q: Q1?\n   A: A1.\n\n2. Q: Q2?\n   A: A2.");
  });
});

// retrieveRelevantFaqs talks to OpenAI (embeddings) and Supabase (the
// match_faqs RPC) -- both are mocked here so this test exercises our own
// logic (how the embedding and threshold/count are passed through, and how
// an RPC error is surfaced) without making real network calls.
vi.mock("./openai", () => ({
  createEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
}));

describe("retrieveRelevantFaqs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("embeds the question and calls the match_faqs RPC with it", async () => {
    const { retrieveRelevantFaqs } = await import("./rag");
    const { createEmbedding } = await import("./openai");

    const fakeRows = [{ id: "1", question: "Q", answer: "A", category: "fees", similarity: 0.4 }];
    const supabaseAdmin = { rpc: vi.fn(async () => ({ data: fakeRows, error: null })) };

    const result = await retrieveRelevantFaqs(supabaseAdmin, "How much are the fees?");

    expect(createEmbedding).toHaveBeenCalledWith("How much are the fees?");
    expect(supabaseAdmin.rpc).toHaveBeenCalledWith(
      "match_faqs",
      expect.objectContaining({ query_embedding: [0.1, 0.2, 0.3] })
    );
    expect(result).toBe(fakeRows);
  });

  it("throws a clear error if the RPC call fails", async () => {
    const { retrieveRelevantFaqs } = await import("./rag");
    const supabaseAdmin = {
      rpc: vi.fn(async () => ({ data: null, error: { message: "connection refused" } })),
    };

    await expect(retrieveRelevantFaqs(supabaseAdmin, "test")).rejects.toThrow(/RAG lookup failed/);
  });
});
