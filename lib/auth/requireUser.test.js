import { describe, it, expect, vi, beforeEach } from "vitest";

const getUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser } })),
}));

describe("requireUser", () => {
  beforeEach(() => {
    getUser.mockReset();
  });

  it("returns null when nobody is logged in (e.g. a prospective student)", async () => {
    const { requireUser } = await import("./requireUser");
    getUser.mockResolvedValue({ data: { user: null } });

    expect(await requireUser()).toBeNull();
  });

  it("returns the user for a logged-in student", async () => {
    const { requireUser } = await import("./requireUser");
    const student = { id: "u1", user_metadata: { role: "student" } };
    getUser.mockResolvedValue({ data: { user: student } });

    expect(await requireUser()).toBe(student);
  });

  it("returns the user for a logged-in admin too (any account counts)", async () => {
    const { requireUser } = await import("./requireUser");
    const admin = { id: "u2", user_metadata: { role: "admin" } };
    getUser.mockResolvedValue({ data: { user: admin } });

    expect(await requireUser()).toBe(admin);
  });
});
