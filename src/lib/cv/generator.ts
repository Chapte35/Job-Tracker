import { getPuppeteerLaunchOptions } from "@/lib/scrapers/browser";
import { patchCvHtml, type CvPatch } from "./patcher";

/**
 * Génère un PDF du CV light à partir du patch fourni.
 * Retourne un Buffer contenant le PDF.
 */
export async function generateCvPdf(patch: CvPatch): Promise<Buffer> {
  const patchedHtml = patchCvHtml(patch);

  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch(getPuppeteerLaunchOptions());

  try {
    const page = await browser.newPage();

    // Charger le HTML patché directement en mémoire (pas de fichier temp)
    await page.setContent(patchedHtml, { waitUntil: "load" });
    await page.evaluateHandle("document.fonts.ready");

    // Forcer le thème light + background blanc (comme generate-pdf-light.js)
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.body.style.background = "#ffffff";
    });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
