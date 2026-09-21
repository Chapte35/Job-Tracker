/**
 * Analyse IA d'une offre : TL;DR + extraction d'infos clés structurées
 * Feature 8 — résumé rapide pour lire en diagonale
 */

import { ollamaChat, parseJsonResponse } from "./ollama";

export interface OfferKeyInfo {
  stack: string[];        // technologies mentionnées
  level: string;          // ex: "Junior", "Senior", "Non précisé"
  remote: string;         // ex: "Full remote", "Hybride 2j/sem", "Présentiel"
  salary: string;         // ex: "40-50k€", "Non communiqué"
  contract: string;       // ex: "CDI", "Freelance TJM", "CDD"
}

export interface OfferAnalysis {
  summary: string;        // TL;DR 3-4 lignes (markdown bullet points)
  keyInfo: OfferKeyInfo;
}

export async function analyzeOffer(
  title: string,
  company: string,
  description: string | null,
  contractType: string | null,
  salary: string | null
): Promise<OfferAnalysis> {
  if (!description || description.trim().length < 50) {
    return {
      summary: "Description trop courte pour générer un résumé.",
      keyInfo: {
        stack: [],
        level: "Non précisé",
        remote: "Non précisé",
        salary: salary ?? "Non communiqué",
        contract: contractType ?? "Non précisé",
      },
    };
  }

  const prompt = `Tu es un assistant RH. Analyse cette offre d'emploi et fournis :
1. Un résumé TL;DR en 3-4 bullet points (format markdown avec tirets)
2. Les infos clés extraites

Offre :
Titre : ${title}
Entreprise : ${company}
Type de contrat : ${contractType ?? "Non précisé"}
Salaire affiché : ${salary ?? "Non communiqué"}
Description : ${description.slice(0, 3000)}

Réponds UNIQUEMENT avec ce JSON :
{
  "summary": "- Point 1\\n- Point 2\\n- Point 3",
  "keyInfo": {
    "stack": ["React", "Node.js", "PostgreSQL"],
    "level": "Senior (5+ ans)",
    "remote": "Hybride 2j/semaine",
    "salary": "45-55k€/an",
    "contract": "CDI"
  }
}

Règles :
- summary : 3-4 bullet points markdown courts et factuels, pas d'opinion
- stack : liste les technologies EXPLICITEMENT mentionnées dans l'offre seulement
- level : déduis depuis l'expérience demandée, ou "Non précisé"
- remote : extrait depuis la description, ou "Non précisé"
- salary : depuis la description ou le champ salaire fourni, ou "Non communiqué"
- contract : CDI / CDD / Alternance / Freelance / Stage / etc.`;

  const raw = await ollamaChat(
    [{ role: "user", content: prompt }],
    { temperature: 0.2, num_predict: 512 }
  );

  const parsed = parseJsonResponse<{
    summary?: unknown;
    keyInfo?: Partial<OfferKeyInfo>;
  }>(raw);

  return {
    summary:
      typeof parsed.summary === "string"
        ? parsed.summary
        : "Résumé non disponible.",
    keyInfo: {
      stack: Array.isArray(parsed.keyInfo?.stack) ? (parsed.keyInfo.stack as string[]) : [],
      level: typeof parsed.keyInfo?.level === "string" ? parsed.keyInfo.level : "Non précisé",
      remote: typeof parsed.keyInfo?.remote === "string" ? parsed.keyInfo.remote : "Non précisé",
      salary: typeof parsed.keyInfo?.salary === "string" ? parsed.keyInfo.salary : (salary ?? "Non communiqué"),
      contract: typeof parsed.keyInfo?.contract === "string" ? parsed.keyInfo.contract : (contractType ?? "Non précisé"),
    },
  };
}
