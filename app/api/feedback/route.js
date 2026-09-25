// POST /api/feedback -- a student clicking thumbs up/down (with an optional
// comment) under a bot reply. One rating per message: clicking the other
// thumb (or the same thumb again) just replaces the row, via an "upsert"
// keyed on message_id (see the unique index on feedback.message_id in
// schema_v2_student_accounts.sql).

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth/requireUser";

export async function POST(request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { messageId, rating, comment } = await request.json();

  if (!messageId || !["up", "down"].includes(rating)) {
    return NextResponse.json(
      { error: "'messageId' and a 'rating' of 'up' or 'down' are required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("feedback")
    .upsert(
      { message_id: messageId, rating, comment: comment || null, user_id: user.id },
      { onConflict: "message_id" }
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
