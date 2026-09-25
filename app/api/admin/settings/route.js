// /api/admin/settings -- the single admin-editable settings row (see the
// `settings` table in supabase/schema_v2_student_accounts.sql).
// GET -> read current settings. PUT -> update them.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth/requireAdmin";

const UNAUTHORIZED = NextResponse.json({ error: "Not authorized." }, { status: 401 });

export async function GET() {
  if (!(await requireAdmin())) return UNAUTHORIZED;

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ settings: data });
}

export async function PUT(request) {
  if (!(await requireAdmin())) return UNAUTHORIZED;

  const { institutionName, welcomeMessage } = await request.json();
  if (!institutionName?.trim() || !welcomeMessage?.trim()) {
    return NextResponse.json(
      { error: "'institutionName' and 'welcomeMessage' are required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("settings")
    .update({
      institution_name: institutionName,
      welcome_message: welcomeMessage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1)
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ settings: data });
}
