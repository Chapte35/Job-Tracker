import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 15;

/**
 * Proxy HTTP pour afficher les pages d'offres dans une iframe sandboxée.
 * Contourne les headers X-Frame-Options / CSP des sites cibles.
 * Usage : /api/offer-proxy?url=https://...
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return new NextResponse("url param required", { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return new NextResponse("URL invalide", { status: 400 });
  }

  const allowed = [
    "welcometothejungle.com",
    "francetravail.fr",
    "linkedin.com",
    "indeed.com",
    "pole-emploi.fr",
  ];

  if (!allowed.some((domain) => parsed.hostname.endsWith(domain))) {
    return new NextResponse("Domaine non autorisé", { status: 403 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9",
      },
    });

    const html = await res.text();

    // Injecter CSS pour masquer chrome du site et ne montrer que l'annonce
    const cleaned = html.replace(
      "</head>",
      `<style>
        header, nav, footer,
        [class*="header"], [class*="navbar"], [class*="navigation"],
        [class*="cookie"], [class*="banner"], [class*="modal"],
        [class*="overlay"], [class*="sidebar"], [class*="aside"],
        [id*="cookie"], [id*="banner"], [id*="modal"], [id*="gdpr"],
        [role="banner"], [role="navigation"], [role="complementary"] {
          display: none !important;
        }
        body {
          padding: 24px !important;
          max-width: 860px !important;
          margin: 0 auto !important;
          font-family: system-ui, sans-serif !important;
        }
      </style></head>`
    );

    return new NextResponse(cleaned, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "X-Frame-Options": "SAMEORIGIN",
        "Content-Security-Policy": "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:",
      },
    });
  } catch (err) {
    console.error("[offer-proxy] erreur:", err);
    return new NextResponse("Erreur lors du chargement de la page", { status: 502 });
  }
}
