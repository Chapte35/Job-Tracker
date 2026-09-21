import { getPuppeteerLaunchOptions } from "./browser";
import type { ScrapedOffer } from "./france-travail";

const CONCURRENCY = 5;

/**
 * Enrichit les offres avec le HTML de la description (pas le textContent brut).
 * On stocke du HTML minimal qu'on convertira en markdown côté affichage.
 */
export async function enrichOffers(offers: ScrapedOffer[]): Promise<ScrapedOffer[]> {
  const puppeteer = await import("puppeteer");

  const chunks: ScrapedOffer[][] = [];
  for (let i = 0; i < offers.length; i += CONCURRENCY) {
    chunks.push(offers.slice(i, i + CONCURRENCY));
  }

  const enriched: ScrapedOffer[] = [];

  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(async (offer) => {
        if (!offer.url) return offer;

        const browser = await puppeteer.default.launch(getPuppeteerLaunchOptions());
        try {
          const page = await browser.newPage();

          await page.setUserAgent(
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
          );

          // Bloquer les ressources inutiles
          await page.setRequestInterception(true);
          page.on("request", (req) => {
            if (["image", "font", "media"].includes(req.resourceType())) {
              req.abort();
            } else {
              req.continue();
            }
          });

          await page.goto(offer.url, { waitUntil: "domcontentloaded", timeout: 20_000 });
          await new Promise((r) => setTimeout(r, 1500));

          // Extraire le HTML de la zone description (pas le textContent)
          const html = await page.evaluate((source) => {
            const selectors: string[] = [];

            if (source === "welcome_to_the_jungle") {
              selectors.push(
                '[data-testid="job-section-description"]',
                '[class*="sc-"][class*="description"]',
                "article[class*='job']",
                "main article",
              );
            } else if (source === "france_travail") {
              selectors.push(
                ".description-offre",
                "#descriptionOffreContainer",
                "[itemprop='description']",
              );
            } else if (source === "linkedin") {
              selectors.push(
                ".description__text",
                ".show-more-less-html__markup",
              );
            } else if (source === "indeed") {
              selectors.push(
                "#jobDescriptionText",
                ".jobsearch-jobDescriptionText",
              );
            }

            // Fallback générique
            selectors.push(
              "article",
              "main",
              "[class*='description']",
              "[class*='content']",
            );

            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (!el) continue;

              // Nettoyer le HTML : garder seulement les balises sémantiques utiles
              const clone = el.cloneNode(true) as Element;

              // Supprimer scripts, styles, boutons, nav
              clone.querySelectorAll("script, style, button, nav, header, footer, [class*='apply'], [class*='button'], [class*='cta']").forEach((n) => n.remove());

              const text = clone.textContent?.trim() ?? "";
              if (text.length < 100) continue;

              // Retourner le innerHTML nettoyé
              return clone.innerHTML.slice(0, 50_000);
            }

            return null;
          }, offer.source);

          console.log(
            `[enrich] ${offer.company} — ${offer.title}: ${html ? `${html.length} chars HTML` : "rien"}`
          );

          return { ...offer, description: html };
        } catch (err) {
          console.warn(`[enrich] échec pour ${offer.url}:`, err instanceof Error ? err.message : err);
          return offer;
        } finally {
          await browser.close();
        }
      })
    );
    enriched.push(...results);
  }

  return enriched;
}
