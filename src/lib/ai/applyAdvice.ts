/**
 * Conseils IA "Comment postuler" pour une offre donnée
 * Feature 4 — angle d'accroche, points forts/faibles, type de contrat à cibler
 */

import { ollamaChat, parseJsonResponse } from "./ollama";
import { getCandidateProfile, buildProfileText } from "./profile";

export interface ApplyAdvice {
  contractAdvice: string;     // quel type de contrat proposer et pourquoi
  hookAngle: string;          // angle d'accroche pour la candidature (1 paragraphe)
  strengths: string[];        // 2-3 points forts à mettre en avant
  weaknesses: string[];       // 1-2 points à anticiper / compenser
  keyTechToHighlight: string[]; // technos du profil à mentionner en priorité
}

const FALLBACK_PROFILE = `
Candidat : Sébastien Laloë
Développeur Full-Stack, Rennes + télétravail
Stack : React, Next.js, TypeScript, Spring Boot, Angular, React Native
IA/Automation : N8N, MistralAI, Ollama
2 ans d'expérience en production, BAC+3 CDA ENI Rennes
`.trim();

export async function getApplyAdvice(
  offerId: string,
  title: string,
  company: string,
  description: string | null,
  contractType: string | null
): Promise<ApplyAdvice> {
  const profile = await getCandidateProfile();
  const profileText = profile ? buildProfileText(profile) : FALLBACK_PROFILE;

  const prompt = `Tu es un coach en recherche d'emploi expert en développement logiciel.
Génère des conseils personnalisés pour postuler à cette offre.

Profil du candidat :
${profileText}

Offre visée :
Titre : ${title}
Entreprise : ${company}
Type de contrat : ${contractType ?? "Non précisé"}
Description : ${description ? description.slice(0, 2500) : "Non disponible"}

Analyse l'adéquation entre le profil et l'offre, puis réponds UNIQUEMENT avec ce JSON :
{
  "contractAdvice": "Postule en CDI car... / Propose un forfait car...",
  "hookAngle": "Met en avant ton expérience en... pour cette mission qui cherche...",
  "strengths": [
    "Point fort 1 spécifique à cette offre",
    "Point fort 2 spécifique à cette offre"
  ],
  "weaknesses": [
    "Point à anticiper : tu n'as pas d'expérience en X, mais tu peux le compenser par Y"
  ],
  "keyTechToHighlight": ["React", "TypeScript", "Docker"]
}

Règles :
- contractAdvice : conseil concret sur le type de contrat à proposer (CDI / freelance / AT) selon le contexte
- hookAngle : 2-3 phrases MAX, concrètes et différenciantes, pas de généralités
- strengths : 2-3 éléments du profil qui correspondent DIRECTEMENT à cette offre
- weaknesses : 1-2 gaps potentiels avec une piste de compensation concrète (si aucun gap : tableau vide)
- keyTechToHighlight : technologies du profil à mettre en avant POUR CETTE offre (max 5)`;

  const raw = await ollamaChat(
    [{ role: "user", content: prompt }],
    { temperature: 0.4, num_predict: 768 }
  );

  const parsed = parseJsonResponse<Partial<ApplyAdvice>>(raw);

  return {
    contractAdvice:
      typeof parsed.contractAdvice === "string"
        ? parsed.contractAdvice
        : "Analyse le type de contrat proposé et adapte ta candidature en conséquence.",
    hookAngle:
      typeof parsed.hookAngle === "string"
        ? parsed.hookAngle
        : "Mets en avant ton expérience full-stack et ta capacité à intervenir rapidement.",
    strengths: Array.isArray(parsed.strengths)
      ? (parsed.strengths as string[]).slice(0, 3)
      : [],
    weaknesses: Array.isArray(parsed.weaknesses)
      ? (parsed.weaknesses as string[]).slice(0, 2)
      : [],
    keyTechToHighlight: Array.isArray(parsed.keyTechToHighlight)
      ? (parsed.keyTechToHighlight as string[]).slice(0, 5)
      : [],
  };
}
