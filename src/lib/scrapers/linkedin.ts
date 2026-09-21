import type { ScrapedOffer } from "./france-travail";
import { getPuppeteerLaunchOptions } from "./browser";

/**
 * Scraper LinkedIn Jobs — FALLBACK
 *
 * LinkedIn bloque activement le scraping.
 * Cette implémentation scrape les pages publiques /jobs/search
 * (sans connexion) qui ont du contenu HTML statique limité.
 *
 * Limitations connues :
 * - Max ~25 offres par page (pagination bloquée sans compte)
 * - Description non disponible sans cliquer sur chaque offre
 * - Risque de CAPTCHA ou block IP si trop de requêtes
 */

const LI_BASE = "https://www.linkedin.com";

const SELECTORS = {
  jobCard: ".jobs-search__results-list li, .base-card",
  title: ".base-search-card__title, h3.base-search-card__title",
  company: ".base-search-card__subtitle a, .hidden-nested-link",
  location: ".job-search-card__location, .base-search-card__metadata",
  link: "a.base-card__full-link, a[data-tracking-control-name='public_jobs_jserp-result_search-card']",
};

export async function scrapeLinkedin(
  pageUrl: string
): Promise<ScrapedOffer[]> {
  const puppeteer = await import("puppeteer");

  const browser = await puppeteer.default.launch(getPuppeteerLaunchOptions());

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "fr-FR,fr;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
    });

    // Bloquer les ressources inutiles pour aller plus vite
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["image", "stylesheet", "font"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

    // Attendre les résultats ou timeout silencieux
    await page
      .waitForSelector(SELECTORS.jobCard, { timeout: 8_000 })
      .catch(() => null);

    // Scroll pour déclencher le lazy-load
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 1500));

    const offers = await page.evaluate(
      (selectors: typeof SELECTORS, baseUrl: string) => {
        const cards = Array.from(
          document.querySelectorAll(selectors.jobCard)
        );

        return cards.map((card) => {
          const titleEl = card.querySelector(selectors.title);
          const companyEl = card.querySelector(selectors.company);
          const locationEl = card.querySelector(selectors.location);
          const linkEl = card.querySelector(selectors.link);

          const href = linkEl?.getAttribute("href") ?? "";
          const url = href.startsWith("http") ? href : `${baseUrl}${href}`;

          // Nettoyer l'URL LinkedIn (supprimer les query params de tracking)
          let cleanUrl = url;
          try {
            const u = new URL(url);
            cleanUrl = `${u.origin}${u.pathname}`;
          } catch {
            // garder l'url brute si invalide
          }

          return {
            url: cleanUrl,
            title: titleEl?.textContent?.trim() ?? "",
            company: companyEl?.textContent?.trim() ?? "",
            location: locationEl?.textContent?.trim() ?? null,
            salary: null,
            contract_type: null,
            description: null,
            source: "linkedin" as const,
          };
        });
      },
      SELECTORS,
      LI_BASE
    );

    return offers.filter((o) => o.title && o.url && o.url !== LI_BASE);
  } finally {
    await browser.close();
  }
}
