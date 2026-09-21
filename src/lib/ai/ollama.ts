/**
 * Couche bas niveau Ollama — appel HTTP brut
 */

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
export const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";

export interface OllamaMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function ollamaChat(
  messages: OllamaMessage[],
  options: { temperature?: number; num_predict?: number } = {}
): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      messages,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.3,
        num_predict: options.num_predict ?? 512,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);
  }

  const data = (await res.json()) as {
    message?: { content?: string };
    error?: string;
  };

  if (data.error) throw new Error(`Ollama: ${data.error}`);

  return data.message?.content?.trim() ?? "";
}

/**
 * Parse le JSON retourné par Ollama de façon robuste.
 * Ollama a parfois tendance à emballer son JSON dans des balises ```json...```
 */
export function parseJsonResponse<T>(raw: string): T {
  // Enlever les balises ```json ... ```
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Tenter d'extraire le premier objet JSON trouvé
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]) as T;
    }
    throw new Error(`JSON invalide depuis Ollama: ${raw.slice(0, 200)}`);
  }
}
