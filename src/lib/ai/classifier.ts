/**
 * Classification de pertinence — score 1-10 + résumé
 * Version refactorisée : lit le profil depuis la DB plutôt qu'un profil hardcodé
 */

import { ollamaChat, parseJsonResponse } from "./ollama";
import { getCandidateProfile, buildProfileText } from "./profile";

export interface RelevanceResult {
  score: number;   // 1–10
  summary: string; // 1-2 phrases
}

const FALLBACK_PROFILE = `
Candidat : Sébastien Laloë
Développeur Full-Stack, Rennes + télétravail, AT ou forfait
Stack : React, Next.js, TypeScript, Spring Boot, Angular, React Native, Node.js
IA/Automation : N8N, MistralAI, GPT-4o, Ollama
DevOps : Docker, GitLab CI/CD, Jenkins
BAC+3 CDA, 2 ans d'expérience en production
Pas intéressé par : support, sysadmin pur, langages exotiques
`.trim();

export async function classifyOffer(
  title: string,
  company: string,
  description: string | null,
  contractType: string | null
): Promise<RelevanceResult> {
  const profile = await getCandidateProfile();
  const profileText = profile ? buildProfileText(profile) : FALLBACK_PROFILE;

  // Étape 1 : raisonnement libre (chain-of-thought)
  const reasoningPrompt = `Tu es un assistant de recrutement expert. Analyse la compatibilité entre ce profil et cette offre.

## Profil du candidat
${profileText}

## Offre à évaluer
Titre : ${title}
Entreprise : ${company}
Type de contrat : ${contractType ?? "Non précisé"}
Description : ${description ? description.slice(0, 2000) : "Non disponible"}

Réponds en 3-4 phrases courtes :
1. Quelles technologies du profil matchent avec l'offre ?
2. Quels sont les points de friction (stack inconnue, niveau trop élevé, contrat inadapté, etc.) ?
3. Quel score entre 1 et 10 mérite cette offre, en sachant que 5 = moyen, 8+ = excellent match, 2 = hors cible ?`;

  const reasoning = await ollamaChat(
    [{ role: "user", content: reasoningPrompt }],
    { temperature: 0.3, num_predict: 300 }
  );

  // Étape 2 : extraction JSON à partir du raisonnement
  const jsonPrompt = `Sur la base de cette analyse :
"""
${reasoning}
"""

Extrais le score et génère un résumé en 1-2 phrases.
Réponds UNIQUEMENT avec ce JSON, sans aucun autre texte :
{"score": 6, "summary": "Exemple de résumé."}

Remplace le score 6 par le score réel issu de l'analyse ci-dessus, et le résumé par une synthèse factuelle.`;

  const raw = await ollamaChat(
    [{ role: "user", content: jsonPrompt }],
    { temperature: 0.1, num_predict: 150 }
  );

  const parsed = parseJsonResponse<{ score?: unknown; summary?: unknown }>(raw);

  return {
    score: typeof parsed.score === "number" ? Math.min(10, Math.max(1, Math.round(parsed.score))) : 5,
    summary: typeof parsed.summary === "string" ? parsed.summary : "Analyse non disponible.",
  };
}
