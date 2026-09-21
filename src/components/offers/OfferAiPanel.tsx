"use client";

import { useState, useCallback } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  Code,
  MapPin,
  Banknote,
  FileText,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/cn";
import type { Offer, OfferKeyInfo } from "@/types/supabase";
import type { ApplyAdvice } from "@/lib/ai/applyAdvice";

interface OfferAiPanelProps {
  offer: Offer;
}

// ─── Sous-composant : badge de score coloré ────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 7
      ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
      : score >= 4
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold",
        color
      )}
    >
      {score}/10
    </span>
  );
}

// ─── Sous-composant : infos clés structurées ──────────────────────────────

function KeyInfoGrid({ info }: { info: OfferKeyInfo }) {
  return (
    <div className="grid grid-cols-2 gap-2 mt-3">
      {info.contract && (
        <div className="flex items-start gap-1.5">
          <FileText size={12} className="text-ink-faint mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-ink-faint">Contrat</p>
            <p className="text-xs font-medium text-ink">{info.contract}</p>
          </div>
        </div>
      )}
      {info.level && info.level !== "Non précisé" && (
        <div className="flex items-start gap-1.5">
          <TrendingUp size={12} className="text-ink-faint mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-ink-faint">Niveau</p>
            <p className="text-xs font-medium text-ink">{info.level}</p>
          </div>
        </div>
      )}
      {info.remote && info.remote !== "Non précisé" && (
        <div className="flex items-start gap-1.5">
          <MapPin size={12} className="text-ink-faint mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-ink-faint">Remote</p>
            <p className="text-xs font-medium text-ink">{info.remote}</p>
          </div>
        </div>
      )}
      {info.salary && info.salary !== "Non communiqué" && (
        <div className="flex items-start gap-1.5">
          <Banknote size={12} className="text-ink-faint mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-ink-faint">Salaire</p>
            <p className="text-xs font-medium text-ink">{info.salary}</p>
          </div>
        </div>
      )}
      {info.stack && info.stack.length > 0 && (
        <div className="col-span-2 flex items-start gap-1.5">
          <Code size={12} className="text-ink-faint mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-ink-faint mb-1">Stack demandée</p>
            <div className="flex flex-wrap gap-1">
              {info.stack.map((tech) => (
                <span
                  key={tech}
                  className="px-1.5 py-0.5 rounded bg-bg-overlay text-ink-muted text-xs"
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sous-composant : conseils de candidature ─────────────────────────────

function ApplyAdvicePanel({ advice }: { advice: ApplyAdvice }) {
  return (
    <div className="space-y-3 mt-3">
      {/* Contrat */}
      <div className="p-3 rounded-md bg-accent/5 border border-accent/15">
        <p className="text-xs font-medium text-accent mb-1">Type de contrat</p>
        <p className="text-xs text-ink leading-relaxed">{advice.contractAdvice}</p>
      </div>

      {/* Angle d'accroche */}
      <div className="p-3 rounded-md bg-bg-overlay border border-border-subtle">
        <p className="text-xs font-medium text-ink mb-1 flex items-center gap-1.5">
          <Lightbulb size={11} />
          Angle d'accroche
        </p>
        <p className="text-xs text-ink-muted leading-relaxed">{advice.hookAngle}</p>
      </div>

      {/* Points forts */}
      {advice.strengths.length > 0 && (
        <div>
          <p className="text-xs font-medium text-ink mb-1.5 flex items-center gap-1.5">
            <TrendingUp size={11} className="text-green-500" />
            Points forts à mettre en avant
          </p>
          <ul className="space-y-1">
            {advice.strengths.map((s, i) => (
              <li key={i} className="text-xs text-ink-muted flex items-start gap-1.5">
                <span className="text-green-500 mt-0.5">✓</span>
                {s}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Points à anticiper */}
      {advice.weaknesses.length > 0 && (
        <div>
          <p className="text-xs font-medium text-ink mb-1.5 flex items-center gap-1.5">
            <AlertTriangle size={11} className="text-amber-500" />
            Points à anticiper
          </p>
          <ul className="space-y-1">
            {advice.weaknesses.map((w, i) => (
              <li key={i} className="text-xs text-ink-muted flex items-start gap-1.5">
                <span className="text-amber-500 mt-0.5">!</span>
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Technos à mettre en avant */}
      {advice.keyTechToHighlight.length > 0 && (
        <div>
          <p className="text-xs font-medium text-ink mb-1.5 flex items-center gap-1.5">
            <Code size={11} className="text-accent" />
            Technos à valoriser
          </p>
          <div className="flex flex-wrap gap-1">
            {advice.keyTechToHighlight.map((tech) => (
              <span
                key={tech}
                className="px-1.5 py-0.5 rounded bg-accent/10 text-accent text-xs font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────

export function OfferAiPanel({ offer }: OfferAiPanelProps) {
  const [adviceOpen, setAdviceOpen] = useState(false);
  const [advice, setAdvice] = useState<ApplyAdvice | null>(null);
  const [adviceLoading, setAdviceLoading] = useState(false);
  const [adviceError, setAdviceError] = useState<string | null>(null);

  const loadAdvice = useCallback(async () => {
    if (advice || adviceLoading) return;
    setAdviceLoading(true);
    setAdviceError(null);
    try {
      const res = await fetch(`/api/offers/${offer.id}/apply-advice`);
      if (!res.ok) throw new Error(`Erreur ${res.status}`);
      const data = (await res.json()) as ApplyAdvice;
      setAdvice(data);
    } catch (err) {
      setAdviceError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setAdviceLoading(false);
    }
  }, [offer.id, advice, adviceLoading]);

  const toggleAdvice = () => {
    const next = !adviceOpen;
    setAdviceOpen(next);
    if (next && !advice && !adviceLoading) {
      void loadAdvice();
    }
  };

  // Aucune donnée IA disponible
  const hasAiData =
    offer.relevance_score !== null ||
    offer.ai_offer_summary !== null ||
    offer.ai_key_info !== null;

  if (!hasAiData) {
    return (
      <div className="px-6 py-3 border-t border-border-subtle">
        <p className="text-xs text-ink-faint flex items-center gap-1.5">
          <Sparkles size={11} />
          Pas encore analysée — lance une classification depuis les offres
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-border-subtle">
      {/* ── Section score + résumé rapide ── */}
      <div className="px-6 py-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles size={13} className="text-accent" />
          <span className="text-xs font-semibold text-ink uppercase tracking-wide">
            Analyse IA
          </span>
          {offer.relevance_score !== null && (
            <ScoreBadge score={offer.relevance_score} />
          )}
        </div>

        {/* Résumé de correspondance */}
        {offer.relevance_summary && (
          <p className="text-xs text-ink-muted leading-relaxed mb-3">
            {offer.relevance_summary}
          </p>
        )}

        {/* TL;DR de l'offre */}
        {offer.ai_offer_summary && (
          <div className="p-3 rounded-md bg-bg-overlay border border-border-subtle mb-3">
            <p className="text-xs font-medium text-ink mb-1.5">TL;DR de l'offre</p>
            <div className="prose prose-xs prose-neutral dark:prose-invert max-w-none text-xs text-ink-muted">
              <ReactMarkdown>{offer.ai_offer_summary}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* Infos clés */}
        {offer.ai_key_info && <KeyInfoGrid info={offer.ai_key_info} />}
      </div>

      {/* ── Section conseils candidature (expandable) ── */}
      <div className="border-t border-border-subtle">
        <button
          onClick={toggleAdvice}
          className="w-full flex items-center justify-between px-6 py-3 text-xs font-medium text-ink hover:bg-bg-overlay transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Lightbulb size={12} className="text-accent" />
            Comment postuler
          </span>
          {adviceOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>

        {adviceOpen && (
          <div className="px-6 pb-4">
            {adviceLoading && (
              <div className="flex items-center gap-2 py-4 text-xs text-ink-faint">
                <Loader2 size={13} className="animate-spin" />
                Analyse en cours…
              </div>
            )}
            {adviceError && (
              <p className="text-xs text-red-500 py-2">
                Erreur : {adviceError}
              </p>
            )}
            {advice && <ApplyAdvicePanel advice={advice} />}
          </div>
        )}
      </div>
    </div>
  );
}
