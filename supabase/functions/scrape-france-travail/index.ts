import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Supabase Edge Function — scrape-france-travail
 * Appelle l'API officielle France Travail et insère les nouvelles offres en DB.
 * Déclenchée chaque matin via pg_cron.
 */

const FT_TOKEN_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const FT_API_BASE = "https://api.francetravail.io/partenaire/offresdemploi/v2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function getFtToken(): Promise<string> {
  const clientId = Deno.env.get("FRANCE_TRAVAIL_CLIENT_ID")!;
  const clientSecret = Deno.env.get("FRANCE_TRAVAIL_CLIENT_SECRET")!;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: `api_offresdemploiv2 o2dsoffre application_${clientId}`,
  });

  const res = await fetch(FT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) throw new Error(`FT auth échouée: ${res.status}`);
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

interface FtOffer {
  id: string;
  intitule: string;
  entreprise?: { nom?: string };
  lieuTravail?: { libelle?: string };
  salaire?: { libelle?: string };
  typeContrat?: string;
  description?: string;
  origineOffre?: { urlOrigine?: string };
}

Deno.serve(async () => {
  try {
    const token = await getFtToken();

    // Recherche : dev fullstack Rennes + remote
    const searches = [
      "motsCles=developpeur+fullstack&lieux=35L&range=0-49",
      "motsCles=react+node&lieux=35L&range=0-49",
      "motsCles=développeur+react&range=0-49&modeSelectionResponsabilites=TOUS",
    ];

    const allOffers: FtOffer[] = [];

    for (const params of searches) {
      const res = await fetch(`${FT_API_BASE}/offres/search?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        console.error(`FT search échouée (${res.status}):`, params);
        continue;
      }

      const data = await res.json() as { resultats?: FtOffer[] };
      allOffers.push(...(data.resultats ?? []));
    }

    // Dédupliquer par id
    const seen = new Set<string>();
    const unique = allOffers.filter((o) => {
      if (seen.has(o.id)) return false;
      seen.add(o.id);
      return true;
    });

    console.log(`[scrape-ft] ${unique.length} offres récupérées`);

    if (unique.length === 0) {
      return new Response(JSON.stringify({ inserted: 0, message: "Aucune offre trouvée" }), {
        status: 200,
      });
    }

    // Insérer en DB
    const payloads = unique.map((offer) => ({
      url: offer.origineOffre?.urlOrigine ??
        `https://candidat.francetravail.fr/offres/recherche/detail/${offer.id}`,
      title: offer.intitule,
      company: offer.entreprise?.nom ?? "Entreprise confidentielle",
      location: offer.lieuTravail?.libelle ?? null,
      salary: offer.salaire?.libelle ?? null,
      contract_type: offer.typeContrat ?? null,
      description: offer.description ?? null,
      source: "france_travail" as const,
      status: "new" as const,
    }));

    const { data: inserted, error } = await supabase
      .from("offers")
      .upsert(payloads, { onConflict: "url", ignoreDuplicates: true })
      .select("id");

    if (error) {
      console.error("[scrape-ft] DB error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const insertedCount = inserted?.length ?? 0;
    console.log(`[scrape-ft] ${insertedCount} nouvelles offres insérées`);

    return new Response(
      JSON.stringify({ inserted: insertedCount, total: unique.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[scrape-ft] erreur:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
});
