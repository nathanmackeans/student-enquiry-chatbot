import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// Regression test: the OpenAI client used to be constructed at module
// import time, which meant a missing OPENAI_API_KEY crashed the entire
// route module before our try/catch could turn that into a clean JSON
// error (see the fix in openai.js -- getClient() is now called lazily,
// inside each function, not at the top of the file).
describe("lib/ai/openai module import", () => {
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    vi.resetModules();
  });

  afterAll(() => {
    if (originalKey !== undefined) process.env.OPENAI_API_KEY = originalKey;
  });

  it("does not throw when OPENAI_API_KEY is missing at import time", async () => {
    await expect(import("./openai")).resolves.toBeDefined();
  });

  it("still exports createEmbedding and createChatReply", async () => {
    const mod = await import("./openai");
    expect(typeof mod.createEmbedding).toBe("function");
    expect(typeof mod.createChatReply).toBe("function");
  });
});
