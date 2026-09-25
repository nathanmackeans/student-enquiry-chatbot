// /api/admin/users -- lets admins manage accounts (both students and other
// admins). There's no public sign-up page (see app/login/page.js) -- this
// is the ONLY way new accounts get created.
//
// GET    -> list every account.
// POST   -> create a new account with a random temporary password, which is
//           returned ONCE in the response so the admin can share it with
//           the new user (Supabase has no built-in "send an invite email"
//           without additional email configuration, so this keeps setup
//           simple -- see the README for how to switch to email invites).
// DELETE -> remove an account.

import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/requireAdmin";

const UNAUTHORIZED = NextResponse.json({ error: "Not authorized." }, { status: 401 });

function generateTempPassword() {
  // 12 URL-safe characters -- comfortably past Supabase's default minimum
  // password length, and easy to read/copy over to a student.
  return randomBytes(9).toString("base64url");
}

export async function GET() {
  if (!(await requireAdmin())) return UNAUTHORIZED;

  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const users = data.users
    .map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name || "",
      role: user.user_metadata?.role || "student",
      createdAt: user.created_at,
    }))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return NextResponse.json({ users });
}

export async function POST(request) {
  if (!(await requireAdmin())) return UNAUTHORIZED;

  const { email, fullName, role, department, programme, level, matricNumber } = await request.json();

  if (!email?.trim() || !fullName?.trim() || !["student", "admin"].includes(role)) {
    return NextResponse.json(
      { error: "'email', 'fullName', and a 'role' of 'student' or 'admin' are required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const tempPassword = generateTempPassword();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true, // skip email verification -- there's no public sign-up flow to verify against
    user_metadata: { full_name: fullName, role },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // The academic fields (department/programme/level/matric number) only
  // apply to students, and live on `profiles` rather than in the account's
  // auth metadata -- the trigger in schema_v2 already created that row with
  // full_name/role, so this just fills in the rest.
  if (role === "student" && (department || programme || level || matricNumber)) {
    await supabase
      .from("profiles")
      .update({
        department: department || null,
        programme: programme || null,
        level: level || null,
        matric_number: matricNumber || null,
      })
      .eq("id", data.user.id);
  }

  return NextResponse.json(
    {
      user: { id: data.user.id, email: data.user.email, fullName, role },
      tempPassword,
    },
    { status: 201 }
  );
}

export async function DELETE(request) {
  if (!(await requireAdmin())) return UNAUTHORIZED;

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: "'id' is required." }, { status: 400 });

  const supabase = createAdminClient();
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
