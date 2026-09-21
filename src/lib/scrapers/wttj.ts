import type { ScrapedOffer } from "./france-travail";
import { getPuppeteerLaunchOptions } from "./browser";

const WTTJ_BASE = "https://www.welcometothejungle.com";
const WTTJ_MATCHES_URL = "https://www.welcometothejungle.com/fr/jobs-matches";

interface WttjApiJob {
  slug?: string;
  name?: string;
  contract_type?: string;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_currency?: string | null;
  salary_period?: string | null;
  organization?: { name?: string; slug?: string };
  office?: { city?: string; country_code?: string };
  reference?: string;
  wk_reference?: string;
}

interface WttjJobsResponse {
  data?: WttjApiJob[];
  metadata?: { total?: number; page?: number; per_page?: number; page_count?: number };
}

export async function scrapeWttj(_pageUrl: string): Promise<ScrapedOffer[]> {
  const sessionKey = process.env.WTTJ_SESSION_KEY;
  const csrfToken = process.env.WTTJ_CSRF_TOKEN;

  if (!sessionKey || !csrfToken) {
    throw new Error("WTTJ_SESSION_KEY et WTTJ_CSRF_TOKEN requis dans .env.local");
  }

  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch(getPuppeteerLaunchOptions());

  let searchJobsBaseUrl: string | null = null;
  let capturedCookies: string | null = null;

  try {
    const page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      // @ts-expect-error -- propriété non standard
      window.chrome = { runtime: {} };
      Object.defineProperty(navigator, "languages", { get: () => ["fr-FR", "fr"] });
      Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    });

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 800 });

    await page.setCookie(
      { name: "wttj_api_session_key", value: sessionKey, domain: ".welcometothejungle.com", path: "/", httpOnly: true, secure: true },
      { name: "csrf-token", value: csrfToken, domain: ".welcometothejungle.com", path: "/", httpOnly: false, secure: true }
    );

    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("api.welcometothejungle.com") && url.includes("search/jobs")) {
        const u = new URL(url);
        u.searchParams.delete("page");
        searchJobsBaseUrl = u.toString();
        const reqHeaders = req.headers();
        if (reqHeaders["cookie"]) capturedCookies = reqHeaders["cookie"];
        console.log("[wttj] search/jobs intercepté:", searchJobsBaseUrl);
      }
    });

    await page.goto(WTTJ_MATCHES_URL, { waitUntil: "networkidle0", timeout: 30_000 });
    await new Promise((r) => setTimeout(r, 2000));
  } finally {
    await browser.close();
  }

  if (!searchJobsBaseUrl) {
    throw new Error("WTTJ : impossible d'intercepter l'URL search/jobs — cookies expirés ?");
  }

  const cookieHeader = capturedCookies ?? `wttj_api_session_key=${sessionKey}; csrf-token=${csrfToken}`;
  const fetchHeaders: Record<string, string> = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "fr-FR,fr;q=0.9",
    "Cookie": cookieHeader,
    "Referer": WTTJ_MATCHES_URL,
    "Origin": WTTJ_BASE,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "x-csrf-token": csrfToken,
  };

  const allJobs: WttjApiJob[] = [];
  let currentPage = 1;
  let totalPages = 1;

  do {
    const url = `${searchJobsBaseUrl}&page=${currentPage}`;
    console.log(`[wttj] fetch page ${currentPage}/${totalPages}:`, url);

    const res = await fetch(url, { headers: fetchHeaders });
    if (!res.ok) throw new Error(`WTTJ search/jobs ${res.status} page ${currentPage}`);

    const data = await res.json() as WttjJobsResponse;
    const jobs = data.data ?? [];
    allJobs.push(...jobs);

    totalPages = data.metadata?.page_count ?? 1;
    console.log(`[wttj] page ${currentPage}/${totalPages} — ${jobs.length} jobs`);
    currentPage++;
  } while (currentPage <= totalPages && currentPage <= 10);

  console.log("[wttj] total jobs récupérés:", allJobs.length);

  const seen = new Set<string>();
  return allJobs
    .filter((job) => {
      const key = job.slug ?? job.wk_reference ?? job.reference ?? "";
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((job) => {
      const orgSlug = job.organization?.slug ?? "";
      const jobSlug = job.slug ?? job.wk_reference ?? "";
      const url = orgSlug && jobSlug
        ? `${WTTJ_BASE}/fr/companies/${orgSlug}/jobs/${jobSlug}`
        : "";

      let salary: string | null = null;
      if (job.salary_min && job.salary_max) {
        salary = `${job.salary_min}–${job.salary_max} ${job.salary_currency ?? "€"}/${job.salary_period ?? "an"}`;
      } else if (job.salary_min) {
        salary = `À partir de ${job.salary_min} ${job.salary_currency ?? "€"}`;
      }

      return {
        url,
        title: job.name ?? "",
        company: job.organization?.name ?? "",
        location: job.office?.city ?? null,
        salary,
        contract_type: job.contract_type ?? null,
        description: null,
        source: "welcome_to_the_jungle" as const,
      };
    })
    .filter((o) => o.title && o.url);
}
