import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { classifyOffer } from "@/lib/ai/classifier";
import { analyzeOffer } from "@/lib/ai/analyzeOffer";

export const maxDuration = 120;

interface ClassifyRequestBody {
  /** Si fourni, reclass uniquement cet offer_id */
  offerId?: string;
  /** Si true, reclass même les offres déjà analysées */
  force?: boolean;
  /** Offset pour la pagination lors d'un force=true */
  offset?: number;
}

export async function POST(req: Request) {
  let body: ClassifyRequestBody = {};
  try {
    body = (await req.json()) as ClassifyRequestBody;
  } catch {
    // body optionnel
  }

  // Construire la query selon les options
  const offset = typeof body.offset === "number" ? body.offset : 0;

  let query = supabaseServer
    .from("offers")
    .select("id, title, company, description, contract_type, salary")
    .neq("status", "ignored")
    .order("scraped_at", { ascending: false })
    .range(offset, offset + 19); // batch de 20

  if (body.offerId) {
    query = supabaseServer
      .from("offers")
      .select("id, title, company, description, contract_type, salary")
      .eq("id", body.offerId);
  } else if (!body.force) {
    // Sans force : seulement les offres sans score (pas besoin d'offset, on avance naturellement)
    query = supabaseServer
      .from("offers")
      .select("id, title, company, description, contract_type, salary")
      .neq("status", "ignored")
      .is("relevance_score", null)
      .order("scraped_at", { ascending: false })
      .limit(20);
  }

  const { data: offers, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!offers || offers.length === 0) {
    return NextResponse.json({
      classified: 0,
      message: "Toutes les offres sont déjà classifiées.",
    });
  }

  let classified = 0;
  let failed = 0;

  for (const offer of offers) {
    try {
      // Lancer classification et analyse en parallèle
      const [relevance, analysis] = await Promise.all([
        classifyOffer(offer.title, offer.company, offer.description, offer.contract_type),
        analyzeOffer(offer.title, offer.company, offer.description, offer.contract_type, offer.salary),
      ]);

      await supabaseServer
        .from("offers")
        .update({
          relevance_score: relevance.score,
          relevance_summary: relevance.summary,
          ai_offer_summary: analysis.summary,
          ai_key_info: analysis.keyInfo,
          ai_analyzed_at: new Date().toISOString(),
        })
        .eq("id", offer.id);

      console.log(`[classify] ${offer.title}: ${relevance.score}/10`);
      classified++;
    } catch (err) {
      console.error(`[classify] échec ${offer.title}:`, err);
      failed++;
    }
  }

  return NextResponse.json({
    classified,
    failed,
    total: offers.length,
    message: classified > 0
      ? `${classified} offre${classified > 1 ? "s" : ""} analysée${classified > 1 ? "s" : ""}.`
      : undefined,
  });
}
