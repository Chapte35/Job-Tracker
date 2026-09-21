import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getApplyAdvice } from "@/lib/ai/applyAdvice";

export const maxDuration = 60;

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const { data: offer, error } = await supabaseServer
    .from("offers")
    .select("id, title, company, description, contract_type")
    .eq("id", params.id)
    .single();

  if (error || !offer) {
    return NextResponse.json({ error: "Offre introuvable" }, { status: 404 });
  }

  try {
    const advice = await getApplyAdvice(
      offer.id,
      offer.title,
      offer.company,
      offer.description,
      offer.contract_type
    );
    return NextResponse.json(advice);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur Ollama";
    console.error("[apply-advice]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
