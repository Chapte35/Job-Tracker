/**
 * Client Ollama pour la génération de mails de candidature.
 * Utilise l'API compatible OpenAI d'Ollama (localhost:11434).
 *
 * Modèle recommandé : qwen2.5:7b
 * Installation : ollama pull qwen2.5:7b
 */

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";

export interface MailGenerationInput {
  offerTitle: string;
  offerCompany: string;
  offerDescription: string | null;
  accentTags: string[]; // technos mises en avant dans le CV
}

export interface GeneratedMail {
  subject: string;
  body: string;
}

const SYSTEM_PROMPT = `Tu es Sébastien Laloë, développeur Full-Stack indépendant basé à Rennes.
SIREN : 108 791 427 · APE 62.01Z
Stack principale : React, Spring Boot, Angular, React Native, Node.js, N8N, MistralAI
Diplôme : BAC+3 CDA — ENI École Informatique Rennes (2026)
Site : chapte.dev

Tu rédiges des mails de candidature en français, courts et directs.
Ton style : professionnel mais humain, pas de formules creuses, pas de "je suis très motivé".
Tu vas droit au but : pourquoi cette offre t'intéresse, ce que tu peux apporter, une invitation à échanger.

Format de ta réponse — JSON strict, rien d'autre :
{
  "subject": "Objet du mail (max 80 chars)",
  "body": "Corps du mail complet (salutation, paragraphes, signature)"
}

Signature à utiliser :
Sébastien Laloë
Développeur Full-Stack — EI
chapte.dev | 06 XX XX XX XX`;

const MAIL_TEMPLATES = `
Exemples de bons mails de candidature (adapte, ne copie pas) :

--- EXEMPLE 1 (offre mission) ---
Objet : Candidature développeur React/Node — mission freelance

Bonjour,

Votre offre pour [poste] chez [entreprise] correspond bien à mon profil.
Je travaille actuellement en indépendant sur des missions web fullstack (React, Spring Boot, Node.js) et j'ai une expérience en production sur des apps complexes — notamment une app multi-modules avec WebSockets et pipelines IA chez Ofisi.

Ce qui m'intéresse dans cette mission : [élément spécifique de l'offre].

Disponible pour un échange rapide si vous le souhaitez.

Sébastien Laloë
Développeur Full-Stack — EI
chapte.dev

--- EXEMPLE 2 (offre CDI startup) ---
Objet : Développeur Fullstack — [poste] chez [entreprise]

Bonjour,

Je postule pour le poste de [poste].
Mon profil : 2 ans d'expérience fullstack en production (React/Redux, Spring Boot, PostgreSQL), une appétence réelle pour l'IA intégrée aux workflows métier (N8N, MistralAI, GPT-4o) et des projets perso qui tournent en prod.

Ce qui me parle dans votre stack : [technos spécifiques].

Je suis basé à Rennes, disponible en AT ou forfait.

Sébastien Laloë
chapte.dev
`;

export async function generateMail(
  input: MailGenerationInput
): Promise<GeneratedMail> {
  const userPrompt = `Rédige un mail de candidature pour ce poste.

Poste : ${input.offerTitle}
Entreprise : ${input.offerCompany}
${input.accentTags.length > 0 ? `Technos à mettre en avant (ce que j'ai dans mon CV) : ${input.accentTags.join(", ")}` : ""}
${input.offerDescription ? `\nExtrait de l'annonce :\n${input.offerDescription.slice(0, 2000)}` : ""}

${MAIL_TEMPLATES}

Réponds UNIQUEMENT avec le JSON, rien d'autre.`;

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      stream: false,
      options: {
        temperature: 0.7,
        num_predict: 1024,
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama erreur ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    message?: { content?: string };
    error?: string;
  };

  if (data.error) throw new Error(`Ollama: ${data.error}`);

  const content = data.message?.content ?? "";

  // Parser le JSON retourné par le modèle
  try {
    // Extraire le JSON même si le modèle a ajouté du texte autour
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Pas de JSON dans la réponse");
    const parsed = JSON.parse(jsonMatch[0]) as GeneratedMail;
    if (!parsed.subject || !parsed.body) throw new Error("JSON incomplet");
    return parsed;
  } catch {
    // Fallback : retourner le contenu brut comme body
    return {
      subject: `Candidature ${input.offerTitle} — ${input.offerCompany}`,
      body: content,
    };
  }
}

// ---------------------------------------------------------------
// Génération du mail de relance
// ---------------------------------------------------------------

export interface FollowUpGenerationInput {
  offerTitle: string;
  offerCompany: string;
  originalMailBody: string;
  sentAt: string;
  delayDays: number;
}

export async function generateFollowUpMail(
  input: FollowUpGenerationInput
): Promise<GeneratedMail> {
  const userPrompt = `Rédige un mail de relance pour une candidature sans réponse.

Poste : ${input.offerTitle}
Entreprise : ${input.offerCompany}
Mail initial envoyé le : ${new Date(input.sentAt).toLocaleDateString("fr-FR")}
Délai sans réponse : ${input.delayDays} jours

Mail initial envoyé :
${input.originalMailBody.slice(0, 1000)}

Le mail de relance doit être :
- Très court (3-4 lignes max)
- Poli mais direct
- Rappeler brièvement la candidature initiale
- Demander si le poste est toujours disponible

Réponds UNIQUEMENT avec le JSON, rien d'autre.`;

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      stream: false,
      options: { temperature: 0.5, num_predict: 512 },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama erreur ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = (await res.json()) as {
    message?: { content?: string };
    error?: string;
  };

  if (data.error) throw new Error(`Ollama: ${data.error}`);
  const content = data.message?.content ?? "";

  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Pas de JSON");
    const parsed = JSON.parse(jsonMatch[0]) as GeneratedMail;
    if (!parsed.subject || !parsed.body) throw new Error("JSON incomplet");
    return parsed;
  } catch {
    return {
      subject: `Relance — ${input.offerTitle} chez ${input.offerCompany}`,
      body: content,
    };
  }
}
