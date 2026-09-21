import { NextRequest, NextResponse } from "next/server";
import { scrapeUrl } from "@/lib/scrapers";
import { enrichOffers } from "@/lib/scrapers/enrich";
import { supabaseServer } from "@/lib/supabase/server";
import type { CreateOfferPayload } from "@/types/supabase";

export const maxDuration = 120; // enrichissement batch = plus long

interface ScrapeRequestBody {
  url: string;
}

export async function POST(req: NextRequest) {
  let body: ScrapeRequestBody;
  try {
    body = (await req.json()) as ScrapeRequestBody;
  } catch {
    return NextResponse.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  const { url } = body;
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Le champ 'url' est requis" }, { status: 400 });
  }

  // 1. Scraper les offres
  const result = await scrapeUrl(url);

  if (result.error && result.offers.length === 0) {
    return NextResponse.json(
      { error: result.error, source: result.source },
      { status: 422 }
    );
  }

  if (result.offers.length === 0) {
    return NextResponse.json({
      inserted: 0,
      skipped: 0,
      source: result.source,
      message: "Aucune offre trouvée sur cette page.",
    });
  }

  // 2. Enrichir avec le contenu complet (parallèle)
  console.log(`[scrape] enrichissement de ${result.offers.length} offres...`);
  const enriched = await enrichOffers(result.offers);

  // 3. Insérer en DB
  const payloads: CreateOfferPayload[] = enriched.map((offer) => ({
    url: offer.url,
    title: offer.title,
    company: offer.company,
    location: offer.location,
    salary: offer.salary,
    contract_type: offer.contract_type,
    description: offer.description,
    source: offer.source,
    status: "new" as const,
  }));

  const { data, error } = await supabaseServer
    .from("offers")
    .upsert(payloads, { onConflict: "url", ignoreDuplicates: true })
    .select("id");

  if (error) {
    console.error("[scrape] Supabase insert error:", error);
    return NextResponse.json(
      { error: "Erreur insertion DB", detail: error.message },
      { status: 500 }
    );
  }

  const inserted = data?.length ?? 0;
  const skipped = result.offers.length - inserted;

  return NextResponse.json({
    inserted,
    skipped,
    source: result.source,
    error: result.error,
  });
}
