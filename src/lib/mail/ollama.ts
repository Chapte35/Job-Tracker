/**
 * Client Ollama pour la génération de mails de candidature.
 * Modèle : qwen2.5:7b (local, localhost:11434)
 */

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";

export interface MailGenerationInput {
  offerTitle: string;
  offerCompany: string;
  offerDescription: string | null;
  accentTags: string[];
  /** Signature personnalisée depuis le profil (remplace la signature par défaut) */
  signature?: string;
}

export interface GeneratedMail {
  subject: string;
  body: string;
}

function buildSystemPrompt(signature: string): string {
  return `Tu es Sébastien Laloë, développeur Full-Stack indépendant basé à Rennes.
Stack principale : React, Spring Boot, Angular, React Native, Node.js, N8N, MistralAI
Diplôme : BAC+3 CDA — ENI École Informatique Rennes (2026)
Site : chapte.dev

Tu rédiges des mails de candidature en français.
Ton style : direct, humain, sans bullshit. Pas de "je suis très motivé par votre offre", pas de "je pense être le candidat idéal".
Tu vas droit au but — ce que l'offre a d'intéressant, ce que tu apportes de concret, une invitation à échanger.
Langage pro mais décontracté, comme si tu écrivais à un confrère tech pas à un DRH des années 90.

Format de ta réponse — JSON strict, rien d'autre :
{
  "subject": "Objet du mail (max 80 chars, pas de 'Candidature spontanée' générique)",
  "body": "Corps du mail complet (salutation, paragraphes, signature)"
}

Signature à utiliser à la fin du mail :
${signature}`;
}

const DEFAULT_SIGNATURE = `Sébastien Laloë
Développeur Full-Stack — EI
chapte.dev`;

export async function generateMail(input: MailGenerationInput): Promise<GeneratedMail> {
  const signature = input.signature?.trim() || DEFAULT_SIGNATURE;
  const systemPrompt = buildSystemPrompt(signature);

  const techLine = input.accentTags.length > 0
    ? `\nTechnos que j'ai dans mon CV et à mettre en avant si pertinent : ${input.accentTags.join(", ")}`
    : "";

  const descriptionBlock = input.offerDescription
    ? `\nExtrait de l'annonce :\n${input.offerDescription.slice(0, 2000)}`
    : "";

  const userPrompt = `Rédige un mail de candidature pour ce poste.

Poste : ${input.offerTitle}
Entreprise : ${input.offerCompany}${techLine}${descriptionBlock}

Consignes pour ce mail :
1. Objet : spécifique au poste, pas un copier-coller du titre de l'offre. Ex: "Dev fullstack React/Spring — mission freelance" plutôt que "Candidature Développeur Full-Stack".
2. Intro : accroche directe. Une phrase sur pourquoi CETTE offre t'intéresse (aspect tech, contexte projet, stack) — pas une phrase générique.
3. Paragraphe principal : 2-3 phrases sur ce que tu apportes de concret. Cite 1-2 technos pertinentes si tu les as, mentionne un projet ou une situation réelle si possible (Ofisi, DocWorker, projets React Native, pipelines IA).
4. Closing : court. Une phrase d'invitation à échanger, sans insistance.
5. Signature fournie dans les instructions système — utilise-la telle quelle.

Réponds UNIQUEMENT avec le JSON, rien d'autre.`;

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      stream: false,
      options: { temperature: 0.75, num_predict: 1024 },
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
    if (!jsonMatch) throw new Error("Pas de JSON dans la réponse");
    const parsed = JSON.parse(jsonMatch[0]) as GeneratedMail;
    if (!parsed.subject || !parsed.body) throw new Error("JSON incomplet");
    return parsed;
  } catch {
    return {
      subject: `Candidature ${input.offerTitle} — ${input.offerCompany}`,
      body: content,
    };
  }
}

// ─── Génération du mail de relance ────────────────────────────

export interface FollowUpGenerationInput {
  offerTitle: string;
  offerCompany: string;
  originalMailBody: string;
  sentAt: string;
  delayDays: number;
  signature?: string;
}

export async function generateFollowUpMail(
  input: FollowUpGenerationInput
): Promise<GeneratedMail> {
  const signature = input.signature?.trim() || DEFAULT_SIGNATURE;
  const systemPrompt = buildSystemPrompt(signature);

  const userPrompt = `Rédige un mail de relance pour une candidature sans réponse.

Poste : ${input.offerTitle}
Entreprise : ${input.offerCompany}
Mail initial envoyé le : ${new Date(input.sentAt).toLocaleDateString("fr-FR")}
Délai sans réponse : ${input.delayDays} jours

Mail initial :
${input.originalMailBody.slice(0, 800)}

Le mail de relance doit être très court (3-4 lignes max), poli mais direct.
Rappelle brièvement la candidature, demande si le poste est toujours ouvert.
Pas de formules lourdes.

Réponds UNIQUEMENT avec le JSON, rien d'autre.`;

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
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
