// /api/faqs -- lets admins manage the knowledge base (the "faqs" table).
// GET    -> list all FAQs, newest first.
// POST   -> add a new FAQ. We embed the question+answer immediately, so it's
//           searchable by the chatbot right away.
// PUT    -> edit an existing FAQ. Re-embeds it, since the text changed.
// DELETE -> remove an FAQ.
//
// Every method below starts by calling requireAdmin(): proxy.js only
// protects the /admin/knowledge-base PAGE, not this API route directly, so
// we check the session here too -- otherwise anyone who found this URL
// could edit the knowledge base without logging in.

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createEmbedding } from "@/lib/ai/openai";
import { requireAdmin } from "@/lib/auth/requireAdmin";

const UNAUTHORIZED = NextResponse.json({ error: "Not authenticated." }, { status: 401 });

export async function GET() {
  if (!(await requireAdmin())) return UNAUTHORIZED;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("faqs")
    .select("id, question, answer, category, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ faqs: data });
}

export async function POST(request) {
  if (!(await requireAdmin())) return UNAUTHORIZED;

  const { question, answer, category } = await request.json();

  if (!question?.trim() || !answer?.trim()) {
    return NextResponse.json(
      { error: "Both 'question' and 'answer' are required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Embed the question+answer together so the search also matches on
  // wording that appears only in the answer.
  const embedding = await createEmbedding(`${question}\n${answer}`);

  const { data, error } = await supabase
    .from("faqs")
    .insert({ question, answer, category: category || null, embedding })
    .select("id, question, answer, category, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ faq: data }, { status: 201 });
}

export async function PUT(request) {
  if (!(await requireAdmin())) return UNAUTHORIZED;

  const { id, question, answer, category } = await request.json();

  if (!id || !question?.trim() || !answer?.trim()) {
    return NextResponse.json(
      { error: "'id', 'question' and 'answer' are required." },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();
  const embedding = await createEmbedding(`${question}\n${answer}`);

  const { data, error } = await supabase
    .from("faqs")
    .update({
      question,
      answer,
      category: category || null,
      embedding,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, question, answer, category, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ faq: data });
}

export async function DELETE(request) {
  if (!(await requireAdmin())) return UNAUTHORIZED;

  const { id } = await request.json();

  if (!id) {
    return NextResponse.json({ error: "'id' is required." }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("faqs").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
