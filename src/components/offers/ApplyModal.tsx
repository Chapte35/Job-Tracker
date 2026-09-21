"use client";

import { useState, useEffect } from "react";
import { X, Loader2, RefreshCw, Send, Eye } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Offer } from "@/types/supabase";
import type { CvPatch } from "@/lib/cv/patcher";

interface ApplyModalProps {
  offer: Offer | null;
  onClose: () => void;
  onSuccess: () => void;
}

// Tags disponibles dans le CV (tirés du cv.html)
const ALL_CV_TAGS = [
  "React", "Next.js", "Redux", "Ionic", "TypeScript",
  "React Native", "Expo", "iOS", "Android",
  "N8N", "GPT-4o", "MistralAI", "Ollama",
  "Docker", "Jenkins", "GitLab CI/CD", "GitHub", "Raspberry Pi", "Linux",
  "Spring Boot", "PostgreSQL", "Angular", "Java",
];

const DEFAULT_ACCROCHE =
  "Développeur Full-stack Mobile iOS/Android avec une expérience en production Web sur Java / Spring Boot, Angular et React. J'interviens en mission aussi bien sur une application page blanche, des évolutions, ou de la dette technique. Une appétence pour l'intégration IA dans les workflows métier.";

const DEFAULT_FOLLOW_UP = 7;

type Step = "compose" | "preview" | "sending" | "done";

export function ApplyModal({ offer, onClose, onSuccess }: ApplyModalProps) {
  const [step, setStep] = useState<Step>("compose");
  const [emailTo, setEmailTo] = useState("");
  const [subject, setSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [accroche, setAccroche] = useState(DEFAULT_ACCROCHE);
  const [accentTags, setAccentTags] = useState<string[]>([]);
  const [followUpDays, setFollowUpDays] = useState(DEFAULT_FOLLOW_UP);
  const [generating, setGenerating] = useState(false);
  const [cvPreviewUrl, setCvPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reset à l'ouverture
  useEffect(() => {
    if (offer) {
      setStep("compose");
      setEmailTo("");
      setSubject(`Candidature ${offer.title} — ${offer.company}`);
      setMailBody("");
      setAccroche(DEFAULT_ACCROCHE);
      setAccentTags([]);
      setFollowUpDays(DEFAULT_FOLLOW_UP);
      setCvPreviewUrl(null);
      setError(null);
    }
  }, [offer?.id]);

  // Escape pour fermer
  useEffect(() => {
    if (!offer) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [offer, onClose]);

  if (!offer) return null;

  const toggleTag = (tag: string) => {
    setAccentTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleGenerateMail = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/mail/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerTitle: offer.title,
          offerCompany: offer.company,
          offerDescription: offer.description,
          accentTags,
        }),
      });
      const data = (await res.json()) as { subject?: string; body?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      if (data.subject) setSubject(data.subject);
      if (data.body) setMailBody(data.body);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur génération mail");
    } finally {
      setGenerating(false);
    }
  };

  const handlePreviewCv = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/cv/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accroche, accentTags }),
      });
      const data = (await res.json()) as { pdf?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      if (data.pdf) {
        const url = `data:application/pdf;base64,${data.pdf}`;
        setCvPreviewUrl(url);
        setStep("preview");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur génération CV");
    } finally {
      setGenerating(false);
    }
  };

  const handleSend = async () => {
    if (!emailTo || !subject || !mailBody) {
      setError("Email, objet et corps du mail requis");
      return;
    }
    setStep("sending");
    setError(null);

    const cvPatch: CvPatch = { accroche, accentTags };

    try {
      const res = await fetch("/api/mail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offerId: offer.id,
          emailTo,
          subject,
          body: mailBody,
          followUpDelayDays: followUpDays,
          cvPatch,
        }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      setStep("done");
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur envoi");
      setStep("compose");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className={cn(
        "relative z-10 bg-bg-raised border border-border rounded-lg shadow-2xl flex flex-col",
        step === "preview" ? "w-full max-w-4xl h-[90vh]" : "w-full max-w-2xl max-h-[90vh]"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-ink">Candidater</h2>
            <p className="text-xs text-ink-muted mt-0.5 truncate max-w-xs">
              {offer.title} — {offer.company}
            </p>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Done */}
        {step === "done" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-sm font-medium text-ink">Candidature envoyée !</p>
              <p className="text-xs text-ink-muted mt-1">Relance planifiée dans {followUpDays} jours</p>
            </div>
          </div>
        )}

        {/* Preview CV */}
        {step === "preview" && cvPreviewUrl && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1">
              <iframe
                src={cvPreviewUrl}
                className="w-full h-full border-0"
                title="Aperçu CV"
              />
            </div>
            <div className="shrink-0 px-5 py-3 border-t border-border flex gap-2 justify-end">
              <button
                onClick={() => setStep("compose")}
                className="px-4 py-2 rounded text-sm text-ink-muted hover:text-ink hover:bg-bg-overlay transition-colors"
              >
                Retour
              </button>
              <button
                onClick={() => void handleSend()}
                disabled={!emailTo || !subject || !mailBody}
                className="flex items-center gap-2 px-4 py-2 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Send size={13} />
                Envoyer ce CV + mail
              </button>
            </div>
          </div>
        )}

        {/* Sending */}
        {step === "sending" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 size={24} className="animate-spin text-accent mx-auto mb-3" />
              <p className="text-sm text-ink-muted">Génération du CV et envoi en cours…</p>
            </div>
          </div>
        )}

        {/* Compose */}
        {step === "compose" && (
          <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
            {error && (
              <div className="px-3 py-2 rounded bg-red-50 border border-red-100 text-xs text-red-600">
                {error}
              </div>
            )}

            {/* Section CV */}
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-ink uppercase tracking-wide">CV à envoyer</p>

              {/* Accroche */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink-muted">Accroche</label>
                <textarea
                  value={accroche}
                  onChange={(e) => setAccroche(e.target.value)}
                  rows={3}
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-ink resize-none focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {/* Tags accent */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink-muted">
                  Technos à mettre en avant{" "}
                  <span className="text-ink-faint">({accentTags.length} sélectionnées)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_CV_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-2 py-0.5 rounded text-xs border transition-colors",
                        accentTags.includes(tag)
                          ? "bg-accent/10 border-accent text-accent"
                          : "bg-bg border-border text-ink-muted hover:border-border-strong"
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => void handlePreviewCv()}
                disabled={generating}
                className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-ink-muted hover:text-ink hover:border-border-strong transition-colors disabled:opacity-50"
              >
                {generating ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                Prévisualiser le CV
              </button>
            </div>

            <hr className="border-border" />

            {/* Section mail */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-ink uppercase tracking-wide">Mail</p>
                <button
                  onClick={() => void handleGenerateMail()}
                  disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-ink-muted hover:text-ink hover:border-border-strong transition-colors disabled:opacity-50"
                >
                  {generating
                    ? <Loader2 size={12} className="animate-spin" />
                    : <RefreshCw size={12} />
                  }
                  Générer via Qwen
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink-muted">Destinataire</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="recruteur@entreprise.com"
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink-muted">Objet</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-ink focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-ink-muted">Corps du mail</label>
                <textarea
                  value={mailBody}
                  onChange={(e) => setMailBody(e.target.value)}
                  rows={10}
                  placeholder="Clique sur 'Générer via Qwen' ou écris ton mail ici…"
                  className="w-full bg-bg border border-border rounded px-3 py-2 text-sm text-ink placeholder:text-ink-faint resize-none focus:outline-none focus:border-accent transition-colors font-mono"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="text-xs text-ink-muted shrink-0">Relance si pas de réponse dans</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={followUpDays}
                  onChange={(e) => setFollowUpDays(Number(e.target.value))}
                  className="w-16 bg-bg border border-border rounded px-2 py-1.5 text-sm text-ink text-center focus:outline-none focus:border-accent transition-colors"
                />
                <span className="text-xs text-ink-muted">jours</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer compose */}
        {step === "compose" && (
          <div className="shrink-0 px-5 py-3 border-t border-border flex items-center justify-between">
            <button
              onClick={onClose}
              className="text-sm text-ink-muted hover:text-ink transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={() => void handleSend()}
              disabled={!emailTo || !subject || !mailBody || generating}
              className="flex items-center gap-2 px-4 py-2 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={13} />
              Envoyer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
