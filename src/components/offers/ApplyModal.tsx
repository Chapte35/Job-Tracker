"use client";

import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Send, Eye, Sparkles, Code } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Offer } from "@/types/supabase";
import type { CvPatch } from "@/lib/cv/patcher";
import type { ApplyAdvice } from "@/lib/ai/applyAdvice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ApplyModalProps {
  offer: Offer | null;
  onClose: () => void;
  onSuccess: () => void;
}

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
type MailView = "preview" | "source";

// ─── Convertit le texte brut du mail en HTML stylisé pour le recruteur ─────────

function mailTextToHtml(text: string): string {
  const lines = text.split("\n");
  const htmlLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") {
      htmlLines.push('<div style="height:12px"></div>');
    } else {
      htmlLines.push(
        `<p style="margin:0;padding:0;line-height:1.6">${trimmed.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
      );
    }
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Candidature</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e7">
          <tr>
            <td style="background:#18181b;padding:20px 32px">
              <p style="margin:0;color:#ffffff;font-size:13px;font-weight:500;letter-spacing:0.05em;text-transform:uppercase;opacity:0.7">Candidature</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;color:#18181b;font-size:15px">
              ${htmlLines.join("\n              ")}
            </td>
          </tr>
          <tr>
            <td style="background:#fafafa;border-top:1px solid #e4e4e7;padding:16px 32px">
              <a href="https://chapte.dev" style="color:#71717a;font-size:12px;text-decoration:none">chapte.dev</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function ApplyModal({ offer, onClose, onSuccess }: ApplyModalProps) {
  const [step, setStep] = useState<Step>("compose");
  const [emailTo, setEmailTo] = useState("");
  const [subject, setSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [mailView, setMailView] = useState<MailView>("source");
  const [accroche, setAccroche] = useState(DEFAULT_ACCROCHE);
  const [accentTags, setAccentTags] = useState<string[]>([]);
  const [followUpDays, setFollowUpDays] = useState(DEFAULT_FOLLOW_UP);
  const [generating, setGenerating] = useState(false);
  const [loadingAdvice, setLoadingAdvice] = useState(false);
  const [cvPreviewUrl, setCvPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Reset au changement d'offre + fetch advice pour pré-sélectionner les tags ──
  useEffect(() => {
    if (!offer) return;

    setStep("compose");
    setEmailTo("");
    setSubject(`Candidature ${offer.title} — ${offer.company}`);
    setMailBody("");
    setMailView("source");
    setAccroche(DEFAULT_ACCROCHE);
    setAccentTags([]);
    setFollowUpDays(DEFAULT_FOLLOW_UP);
    setCvPreviewUrl(null);
    setError(null);
    setLoadingAdvice(false);

    // Fetch apply-advice pour pré-sélectionner les tags Ollama
    const fetchAdvice = async () => {
      setLoadingAdvice(true);
      try {
        const res = await fetch(`/api/offers/${offer.id}/apply-advice`);
        if (!res.ok) return;
        const data = (await res.json()) as ApplyAdvice;
        if (Array.isArray(data.suggestedTags) && data.suggestedTags.length > 0) {
          // Ne pré-sélectionner que les tags présents dans ALL_CV_TAGS
          const valid = data.suggestedTags.filter((t) =>
            ALL_CV_TAGS.some((cv) => cv.toLowerCase() === t.toLowerCase())
          );
          setAccentTags(valid);
        }
      } catch {
        // silencieux — la pré-sélection est un best-effort
      } finally {
        setLoadingAdvice(false);
      }
    };

    void fetchAdvice();
  }, [offer?.id]);

  if (!offer) return null;

  const toggleTag = (tag: string) => {
    setAccentTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // ── Génération mail ──────────────────────────────────────────────────────────

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
      if (data.body) {
        setMailBody(data.body);
        setMailView("preview");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur génération mail");
    } finally {
      setGenerating(false);
    }
  };

  // ── Preview CV ───────────────────────────────────────────────────────────────

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

  // ── Envoi ────────────────────────────────────────────────────────────────────

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

  const htmlMail = mailBody ? mailTextToHtml(mailBody) : "";

  // ─── Rendu ───────────────────────────────────────────────────────────────────

  return (
    <Dialog open={!!offer} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className={cn(
        "p-0 gap-0 flex flex-col",
        step === "preview" ? "max-w-4xl h-[90vh]" : "max-w-2xl max-h-[90vh]"
      )}>
        {/* Header */}
        <DialogHeader className="px-5 py-3.5 border-b border-border mb-0 shrink-0">
          <DialogTitle>Candidater</DialogTitle>
          <DialogDescription className="truncate">
            {offer.title} — {offer.company}
          </DialogDescription>
        </DialogHeader>

        {/* ── Done ── */}
        {step === "done" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl mb-3">✅</div>
              <p className="text-sm font-medium text-ink">Candidature envoyée !</p>
              <p className="text-xs text-ink-muted mt-1">Relance planifiée dans {followUpDays} jours</p>
            </div>
          </div>
        )}

        {/* ── Preview CV ── */}
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
              <Button variant="ghost" size="sm" onClick={() => setStep("compose")}>
                Retour
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSend()}
                disabled={!emailTo || !subject || !mailBody}
              >
                <Send size={13} />
                Envoyer ce CV + mail
              </Button>
            </div>
          </div>
        )}

        {/* ── Sending ── */}
        {step === "sending" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 size={24} className="animate-spin text-ink-muted mx-auto mb-3" />
              <p className="text-sm text-ink-muted">Génération du CV et envoi en cours…</p>
            </div>
          </div>
        )}

        {/* ── Compose ── */}
        {step === "compose" && (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
              {error && (
                <div className="px-3 py-2 rounded-md bg-red-50 border border-red-100 text-xs text-red-600">
                  {error}
                </div>
              )}

              {/* ── Section CV ── */}
              <div className="flex flex-col gap-3">
                <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">CV à envoyer</p>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-ink-muted">Accroche</label>
                  <Textarea
                    value={accroche}
                    onChange={(e) => setAccroche(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-ink-muted">
                      Technos à mettre en avant{" "}
                      <span className="text-ink-faint">({accentTags.length} sélectionnées)</span>
                    </label>
                    {loadingAdvice && (
                      <span className="flex items-center gap-1 text-xs text-ink-faint">
                        <Loader2 size={10} className="animate-spin" />
                        <Sparkles size={10} />
                        Suggestions IA…
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_CV_TAGS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-2 py-0.5 rounded text-xs border transition-colors",
                          accentTags.includes(tag)
                            ? "bg-ink text-white border-ink"
                            : "bg-bg border-border text-ink-muted hover:border-border-strong hover:text-ink"
                        )}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  className="self-start"
                  onClick={() => void handlePreviewCv()}
                  disabled={generating}
                >
                  {generating ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />}
                  Prévisualiser le CV
                </Button>
              </div>

              <hr className="border-border" />

              {/* ── Section mail ── */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium text-ink-muted uppercase tracking-wider">Mail</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => void handleGenerateMail()}
                    disabled={generating}
                  >
                    {generating
                      ? <Loader2 size={12} className="animate-spin" />
                      : <RefreshCw size={12} />
                    }
                    Générer via Qwen
                  </Button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-ink-muted">Destinataire</label>
                  <Input
                    type="email"
                    value={emailTo}
                    onChange={(e) => setEmailTo(e.target.value)}
                    placeholder="recruteur@entreprise.com"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-ink-muted">Objet</label>
                  <Input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                {/* Corps du mail : toggle preview HTML / source texte */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-ink-muted">Corps du mail</label>
                    {mailBody && (
                      <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-bg-overlay border border-border">
                        <button
                          onClick={() => setMailView("preview")}
                          className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors",
                            mailView === "preview"
                              ? "bg-bg text-ink shadow-sm"
                              : "text-ink-muted hover:text-ink"
                          )}
                        >
                          <Eye size={10} />
                          Aperçu
                        </button>
                        <button
                          onClick={() => setMailView("source")}
                          className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded text-xs transition-colors",
                            mailView === "source"
                              ? "bg-bg text-ink shadow-sm"
                              : "text-ink-muted hover:text-ink"
                          )}
                        >
                          <Code size={10} />
                          Texte
                        </button>
                      </div>
                    )}
                  </div>

                  {mailView === "preview" && mailBody ? (
                    <div className="rounded-md border border-border overflow-hidden" style={{ height: 320 }}>
                      <iframe
                        srcDoc={htmlMail}
                        className="w-full h-full border-0 bg-white"
                        title="Aperçu mail recruteur"
                        sandbox="allow-same-origin"
                      />
                    </div>
                  ) : (
                    <Textarea
                      value={mailBody}
                      onChange={(e) => setMailBody(e.target.value)}
                      rows={10}
                      placeholder="Clique sur 'Générer via Qwen' ou écris ton mail ici…"
                      className="font-mono text-xs"
                    />
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-xs text-ink-muted shrink-0">Relance si pas de réponse dans</label>
                  <Input
                    type="number"
                    min={1}
                    max={30}
                    value={followUpDays}
                    onChange={(e) => setFollowUpDays(Number(e.target.value))}
                    className="w-16 text-center"
                  />
                  <span className="text-xs text-ink-muted">jours</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="shrink-0 px-5 py-3 border-t border-border flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={onClose}>
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={() => void handleSend()}
                disabled={!emailTo || !subject || !mailBody || generating}
              >
                <Send size={13} />
                Envoyer
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
