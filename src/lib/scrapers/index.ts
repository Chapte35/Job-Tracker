import type { ScrapedOffer } from "./france-travail";
import { scrapeFranceTravail } from "./france-travail";
import { scrapeWttj } from "./wttj";
import { scrapeLinkedin } from "./linkedin";
import { scrapeIndeed } from "./indeed";

export type { ScrapedOffer };

type ScraperSource =
  | "france_travail"
  | "welcome_to_the_jungle"
  | "linkedin"
  | "indeed"
  | "unknown";

const WTTJ_TRIGGER = "wttj"; // mot-clé raccourci accepté en plus de l'URL

function detectSource(url: string): ScraperSource {
  // Raccourci : "wttj" déclenche le scraper jobs-matches sans URL
  if (url.trim().toLowerCase() === WTTJ_TRIGGER) {
    return "welcome_to_the_jungle";
  }

  try {
    const { hostname } = new URL(url);
    if (hostname.includes("francetravail.fr") || hostname.includes("pole-emploi.fr")) {
      return "france_travail";
    }
    if (hostname.includes("welcometothejungle.com")) {
      return "welcome_to_the_jungle";
    }
    if (hostname.includes("linkedin.com")) {
      return "linkedin";
    }
    if (hostname.includes("indeed.com")) {
      return "indeed";
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

export interface ScrapeResult {
  offers: ScrapedOffer[];
  source: ScraperSource;
  error?: string;
}

/**
 * Point d'entrée unique du scraper.
 * Détecte la source depuis l'URL et dispatch vers le bon scraper.
 * WTTJ ignore l'URL passée et scrape toujours /fr/jobs-matches.
 */
export async function scrapeUrl(url: string): Promise<ScrapeResult> {
  const source = detectSource(url);

  if (source === "unknown") {
    return {
      offers: [],
      source,
      error: `Source non supportée. URLs acceptées : francetravail.fr, welcometothejungle.com, linkedin.com, indeed.com — ou "wttj" pour scraper vos jobs-matches.`,
    };
  }

  try {
    let offers: ScrapedOffer[];

    switch (source) {
      case "france_travail":
        offers = await scrapeFranceTravail(url);
        break;
      case "welcome_to_the_jungle":
        offers = await scrapeWttj(url);
        break;
      case "linkedin":
        offers = await scrapeLinkedin(url);
        break;
      case "indeed":
        offers = await scrapeIndeed(url);
        break;
    }

    return { offers, source };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[scraper] erreur:`, message, err);
    return {
      offers: [],
      source,
      error: message,
    };
  }
}
