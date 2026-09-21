import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { classifyOffer } from "@/lib/mail/classifier";

export const maxDuration = 120;

export async function POST() {
  // Récupérer les offres sans score
  const { data: offers, error } = await supabaseServer
    .from("offers")
    .select("id, title, company, description, contract_type")
    .is("relevance_score", null)
    .neq("status", "ignored")
    .order("scraped_at", { ascending: false })
    .limit(20); // max 20 par appel pour pas timeout

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!offers || offers.length === 0) {
    return NextResponse.json({ classified: 0, message: "Toutes les offres sont déjà classifiées." });
  }

  let classified = 0;
  let failed = 0;

  for (const offer of offers) {
    try {
      const result = await classifyOffer(
        offer.title,
        offer.company,
        offer.description,
        offer.contract_type
      );

      await supabaseServer
        .from("offers")
        .update({
          relevance_score: result.score,
          relevance_summary: result.summary,
        })
        .eq("id", offer.id);

      console.log(`[classify] ${offer.title}: ${result.score}/10`);
      classified++;
    } catch (err) {
      console.error(`[classify] échec ${offer.title}:`, err);
      failed++;
    }
  }

  return NextResponse.json({ classified, failed, total: offers.length });
}
