/**
 * Conseils IA "Comment postuler" pour une offre donnée
 * Retourne aussi suggestedTags : les technos à pré-sélectionner dans la modale Apply
 */

import { ollamaChat, parseJsonResponse } from "./ollama";
import { getCandidateProfile, buildProfileText } from "./profile";

export interface ApplyAdvice {
  contractAdvice: string;
  hookAngle: string;
  strengths: string[];
  weaknesses: string[];
  keyTechToHighlight: string[];
  /** Tags à pré-sélectionner dans la modale (subset de keyTechToHighlight + stack profil) */
  suggestedTags: string[];
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

  // Stack complète disponible (pour que le modèle choisisse parmi les vraies technos du profil)
  const allStack = profile
    ? [
        ...profile.stack_backend,
        ...profile.stack_frontend,
        ...profile.stack_mobile,
        ...profile.stack_ai,
        ...profile.stack_devops,
      ]
    : ["React", "Next.js", "TypeScript", "Spring Boot", "Angular", "React Native", "Docker", "N8N"];

  const prompt = `Tu es un coach en recherche d'emploi expert en développement logiciel.
Génère des conseils personnalisés pour postuler à cette offre.

Profil du candidat :
${profileText}

Technos disponibles dans le profil : ${allStack.join(", ")}

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
  "keyTechToHighlight": ["React", "TypeScript", "Docker"],
  "suggestedTags": ["React", "TypeScript"]
}

Règles :
- contractAdvice : conseil concret sur le type de contrat (CDI / freelance / AT) selon le contexte
- hookAngle : 2-3 phrases MAX, concrètes et différenciantes, pas de généralités
- strengths : 2-3 éléments du profil qui correspondent DIRECTEMENT à cette offre
- weaknesses : 1-2 gaps potentiels avec une piste de compensation concrète (si aucun gap : tableau vide)
- keyTechToHighlight : technos du profil à mettre en avant POUR CETTE offre (max 5)
- suggestedTags : sous-ensemble de keyTechToHighlight, UNIQUEMENT des technos dans la liste "Technos disponibles" ci-dessus (max 4, priorise les plus importantes pour cette offre)`;

  const raw = await ollamaChat(
    [{ role: "user", content: prompt }],
    { temperature: 0.4, num_predict: 900 }
  );

  const parsed = parseJsonResponse<Partial<ApplyAdvice & { suggestedTags: string[] }>>(raw);

  const keyTech = Array.isArray(parsed.keyTechToHighlight)
    ? (parsed.keyTechToHighlight as string[]).slice(0, 5)
    : [];

  // suggestedTags : filtré sur la stack réelle du profil pour éviter les hallucinations
  const rawSuggested = Array.isArray(parsed.suggestedTags)
    ? (parsed.suggestedTags as string[])
    : keyTech;

  const allStackLower = allStack.map((t) => t.toLowerCase());
  const suggestedTags = rawSuggested
    .filter((t) => allStackLower.includes(t.toLowerCase()))
    .slice(0, 4);

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
    keyTechToHighlight: keyTech,
    suggestedTags,
  };
}
