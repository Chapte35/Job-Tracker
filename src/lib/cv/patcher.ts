import fs from "fs";
import path from "path";

export interface CvPatch {
  accroche: string;
  accentTags: string[]; // technos à mettre en accent dans la sidebar
}

/**
 * Lit cv.html, applique le patch (accroche + tags accent), retourne le HTML modifié.
 *
 * Les tags "accent" dans la sidebar sont les spans avec class="tag accent".
 * On retire tous les accents existants, puis on remet accent sur les tags
 * dont le texte correspond à accentTags (insensible à la casse).
 */
export function patchCvHtml(patch: CvPatch): string {
  const cvPath = path.join(process.cwd(), "src", "lib", "cv", "cv.html");
  let html = fs.readFileSync(cvPath, "utf-8");

  // 1. Remplacer l'accroche
  // L'accroche est dans .header-pitch
  html = html.replace(
    /(<p class="header-pitch">)([\s\S]*?)(<\/p>)/,
    `$1${escapeHtml(patch.accroche)}$3`
  );

  // 2. Gérer les tags accent dans la sidebar
  // D'abord retirer tous les "accent" existants des tags sidebar
  html = html.replace(
    /(<span class="tag) accent(")/g,
    '$1$2'
  );

  // Ensuite remettre "accent" sur les tags qui correspondent
  if (patch.accentTags.length > 0) {
    const accentSet = new Set(patch.accentTags.map((t) => t.toLowerCase().trim()));

    html = html.replace(
      /<span class="tag">([^<]+)<\/span>/g,
      (match, tagText: string) => {
        if (accentSet.has(tagText.toLowerCase().trim())) {
          return `<span class="tag accent">${tagText}</span>`;
        }
        return match;
      }
    );
  }

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
