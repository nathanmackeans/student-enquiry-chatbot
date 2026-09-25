import { describe, it, expect, vi, beforeEach } from "vitest";

// requireAdmin() calls createClient() from lib/supabase/server, which reads
// real request cookies -- not available outside a request. Mocked here so
// the test exercises only requireAdmin's own role-checking logic.
const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));

describe("requireAdmin", () => {
  beforeEach(() => {
    getUser.mockReset();
  });

  it("returns null when nobody is logged in", async () => {
    const { requireAdmin } = await import("./requireAdmin");
    getUser.mockResolvedValue({ data: { user: null } });

    expect(await requireAdmin()).toBeNull();
  });

  it("returns null for a logged-in user whose role is 'student'", async () => {
    const { requireAdmin } = await import("./requireAdmin");
    getUser.mockResolvedValue({
      data: { user: { id: "u1", user_metadata: { role: "student" } } },
    });

    // This is the exact gap the guard exists to close: being logged in is
    // not the same as being an admin now that students have real accounts.
    expect(await requireAdmin()).toBeNull();
  });

  it("returns null for a user with no role set at all", async () => {
    const { requireAdmin } = await import("./requireAdmin");
    getUser.mockResolvedValue({ data: { user: { id: "u1", user_metadata: {} } } });

    expect(await requireAdmin()).toBeNull();
  });

  it("returns the user when role is 'admin'", async () => {
    const { requireAdmin } = await import("./requireAdmin");
    const adminUser = { id: "u2", user_metadata: { role: "admin" } };
    getUser.mockResolvedValue({ data: { user: adminUser } });

    expect(await requireAdmin()).toBe(adminUser);
  });
});
