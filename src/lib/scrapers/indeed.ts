import type { ScrapedOffer } from "./france-travail";
import { getPuppeteerLaunchOptions } from "./browser";

/**
 * Scraper Indeed — FALLBACK
 *
 * Indeed FR utilise du rendu côté serveur sur les pages publiques,
 * ce qui facilite le parsing. Mais ils bloquent avec Cloudflare
 * sur les requêtes trop fréquentes.
 */

const SELECTORS = {
  jobCard: '[data-testid="slider_item"], .job_seen_beacon, .resultContent',
  title: '[data-testid="jobTitle"] span, h2.jobTitle span',
  company: '[data-testid="company-name"], .companyName',
  location: '[data-testid="text-location"], .companyLocation',
  salary: '[data-testid="attribute_snippet_testid"], .salary-snippet-container',
  link: 'a[data-testid="job-title-link"], h2.jobTitle a',
};

const INDEED_BASE = "https://fr.indeed.com";

export async function scrapeIndeed(pageUrl: string): Promise<ScrapedOffer[]> {
  const puppeteer = await import("puppeteer");

  const browser = await puppeteer.default.launch(getPuppeteerLaunchOptions());

  try {
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "fr-FR,fr;q=0.9",
    });

    // Bloquer images/fonts pour aller plus vite
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      if (["image", "font", "stylesheet"].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto(pageUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

    await page
      .waitForSelector(SELECTORS.jobCard, { timeout: 8_000 })
      .catch(() => null);

    const offers = await page.evaluate(
      (selectors: typeof SELECTORS, baseUrl: string) => {
        const cards = Array.from(
          document.querySelectorAll(selectors.jobCard)
        );

        return cards.map((card) => {
          const titleEl = card.querySelector(selectors.title);
          const companyEl = card.querySelector(selectors.company);
          const locationEl = card.querySelector(selectors.location);
          const salaryEl = card.querySelector(selectors.salary);
          const linkEl = card.querySelector(selectors.link);

          const href = linkEl?.getAttribute("href") ?? "";
          const url = href.startsWith("http") ? href : `${baseUrl}${href}`;

          return {
            url,
            title: titleEl?.textContent?.trim() ?? "",
            company: companyEl?.textContent?.trim() ?? "",
            location: locationEl?.textContent?.trim() ?? null,
            salary: salaryEl?.textContent?.trim() ?? null,
            contract_type: null,
            description: null,
            source: "indeed" as const,
          };
        });
      },
      SELECTORS,
      INDEED_BASE
    );

    return offers.filter((o) => o.title && o.url && !o.url.endsWith(INDEED_BASE));
  } finally {
    await browser.close();
  }
}
