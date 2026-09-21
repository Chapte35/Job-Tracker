/**
 * Classification de pertinence des offres via Ollama qwen2.5:7b
 * Retourne un score 1-10 + résumé en 2 lignes
 */

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";

const PROFILE = `
Profil du candidat : Sébastien Laloë
- Développeur Full-Stack indépendant (EI), basé à Rennes
- Stack principale : React, Next.js, TypeScript, Spring Boot, Angular, React Native, Node.js
- Expérience IA/Automation : N8N, MistralAI, GPT-4o, Ollama
- DevOps : Docker, GitLab CI/CD, Jenkins
- BAC+3 CDA — ENI École Informatique Rennes (2026)
- 2 ans d'expérience en production
- Disponible en mission AT ou forfait, Rennes + télétravail
- Recherche : missions freelance ou CDI fullstack, idéalement avec une composante IA/automation
- Pas intéressé par : support, sysadmin pur, langages exotiques non mentionnés dans son profil
`.trim();

export interface RelevanceResult {
  score: number; // 1-10
  summary: string; // 2 lignes max
}

export async function classifyOffer(
  title: string,
  company: string,
  description: string | null,
  contractType: string | null
): Promise<RelevanceResult> {
  const prompt = `Tu es un assistant de recrutement. Évalue la pertinence de cette offre d'emploi pour ce candidat.

${PROFILE}

Offre :
Titre : ${title}
Entreprise : ${company}
Type de contrat : ${contractType ?? "Non précisé"}
Description : ${description ? description.slice(0, 2000) : "Non disponible"}

Donne un score de pertinence de 1 à 10 (10 = parfaitement adapté) et un résumé en 1-2 phrases expliquant pourquoi.

Critères :
- Stack technique compatible → score élevé
- Mission freelance ou CDI fullstack → score élevé  
- Composante IA/automation → bonus
- Rennes ou télétravail → bonus
- Stack incompatible ou poste non-dev → score bas

Réponds UNIQUEMENT avec ce JSON, rien d'autre :
{"score": 7, "summary": "Poste React/Node compatible avec ton profil, composante IA appréciable. Localisation Rennes idéale."}`;

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [{ role: "user", content: prompt }],
      stream: false,
      options: { temperature: 0.3, num_predict: 256 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama erreur ${res.status}`);
  }

  const data = (await res.json()) as { message?: { content?: string }; error?: string };
  if (data.error) throw new Error(`Ollama: ${data.error}`);

  const content = data.message?.content ?? "";

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Pas de JSON");
    const parsed = JSON.parse(jsonMatch[0]) as RelevanceResult;
    if (typeof parsed.score !== "number" || !parsed.summary) throw new Error("JSON incomplet");
    // Clamp score entre 1 et 10
    parsed.score = Math.max(1, Math.min(10, Math.round(parsed.score)));
    return parsed;
  } catch {
    return { score: 5, summary: "Classification échouée — évaluation manuelle requise." };
  }
}
