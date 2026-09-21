import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { invalidateProfileCache } from "@/lib/ai/profile";
import type { CandidateProfile } from "@/types/supabase";

export async function GET() {
  const { data, error } = await supabaseServer
    .from("candidate_profile")
    .select("*")
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  let body: Partial<CandidateProfile>;
  try {
    body = (await req.json()) as Partial<CandidateProfile>;
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  // Interdire de modifier l'id / updated_at depuis le client
  const { id: _id, updated_at: _ua, ...safeBody } = body as Record<string, unknown>;

  // Récupérer l'id existant
  const { data: existing, error: fetchErr } = await supabaseServer
    .from("candidate_profile")
    .select("id")
    .limit(1)
    .single();

  if (fetchErr || !existing) {
    return NextResponse.json({ error: "Profil introuvable" }, { status: 404 });
  }

  const { data, error } = await supabaseServer
    .from("candidate_profile")
    .update(safeBody)
    .eq("id", existing.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Invalider le cache profil utilisé par Ollama
  invalidateProfileCache();

  return NextResponse.json(data);
}
