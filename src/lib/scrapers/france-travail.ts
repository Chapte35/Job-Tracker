/**
 * Client France Travail API
 * Doc officielle : https://francetravail.io/produits-partages/catalogue/offres-demploi
 *
 * Flow OAuth2 : Client Credentials (pas d'utilisateur)
 * Token valide 30 minutes — on le cache en mémoire (suffisant pour une API Route)
 */

const FT_TOKEN_URL =
  "https://entreprise.francetravail.fr/connexion/oauth2/access_token?realm=%2Fpartenaire";
const FT_API_BASE = "https://api.francetravail.io/partenaire/offresdemploi/v2";

interface FtToken {
  access_token: string;
  expires_at: number; // timestamp ms
}

// Cache en module-scope (dure le temps du process Next.js)
let cachedToken: FtToken | null = null;

async function getToken(): Promise<string> {
  const clientId = process.env.FRANCE_TRAVAIL_CLIENT_ID;
  const clientSecret = process.env.FRANCE_TRAVAIL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "FRANCE_TRAVAIL_CLIENT_ID et FRANCE_TRAVAIL_CLIENT_SECRET requis"
    );
  }

  // Réutiliser le token si encore valide (marge 60s)
  if (cachedToken && cachedToken.expires_at - 60_000 > Date.now()) {
    return cachedToken.access_token;
  }

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

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`France Travail auth échouée (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.access_token;
}

// -------------------------------------------------------------------
// Types retournés par l'API France Travail
// -------------------------------------------------------------------

interface FtOfferRaw {
  id: string;
  intitule: string;
  entreprise?: { nom?: string };
  lieuTravail?: { libelle?: string };
  salaire?: { libelle?: string };
  typeContrat?: string;
  description?: string;
  origineOffre?: { urlOrigine?: string };
  dateCreation?: string;
}

interface FtSearchResponse {
  resultats: FtOfferRaw[];
}

// -------------------------------------------------------------------
// Résultat normalisé (même format que les autres scrapers)
// -------------------------------------------------------------------

export interface ScrapedOffer {
  url: string;
  title: string;
  company: string;
  location: string | null;
  salary: string | null;
  contract_type: string | null;
  description: string | null;
  source: "france_travail" | "welcome_to_the_jungle" | "linkedin" | "indeed" | "manual";
}

// -------------------------------------------------------------------
// Parseur d'URL France Travail
// Exemple : https://candidat.francetravail.fr/offres/recherche?motsCles=developpeur&lieux=44L
// -------------------------------------------------------------------

function parseFtUrl(url: string): URLSearchParams {
  try {
    const parsed = new URL(url);
    return parsed.searchParams;
  } catch {
    throw new Error(`URL France Travail invalide : ${url}`);
  }
}

// -------------------------------------------------------------------
// Scraper France Travail
// -------------------------------------------------------------------

export async function scrapeFranceTravail(
  pageUrl: string
): Promise<ScrapedOffer[]> {
  const token = await getToken();

  const params = parseFtUrl(pageUrl);

  // Mapping paramètres URL candidat → paramètres API partenaire
  const apiParams = new URLSearchParams({
    range: "0-149", // max 150 résultats par appel
  });

  const motsCles = params.get("motsCles");
  if (motsCles) apiParams.set("motsCles", motsCles);

  const lieux = params.get("lieux");
  if (lieux) apiParams.set("commune", lieux);

  const typeContrat = params.get("typeContrat");
  if (typeContrat) apiParams.set("typeContrat", typeContrat);

  const res = await fetch(
    `${FT_API_BASE}/offres/search?${apiParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`France Travail API (${res.status}): ${text}`);
  }

  const data = (await res.json()) as FtSearchResponse;

  return (data.resultats ?? []).map((offer) => ({
    url:
      offer.origineOffre?.urlOrigine ??
      `https://candidat.francetravail.fr/offres/recherche/detail/${offer.id}`,
    title: offer.intitule,
    company: offer.entreprise?.nom ?? "Entreprise confidentielle",
    location: offer.lieuTravail?.libelle ?? null,
    salary: offer.salaire?.libelle ?? null,
    contract_type: offer.typeContrat ?? null,
    description: offer.description ?? null,
    source: "france_travail",
  }));
}
