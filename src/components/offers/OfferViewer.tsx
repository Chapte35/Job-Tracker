"use client";

import { useMemo } from "react";
import { ExternalLink, Star, EyeOff, Send, MapPin, Euro, Briefcase } from "lucide-react";
import ReactMarkdown from "react-markdown";
import TurndownService from "turndown";
import { cn } from "@/lib/cn";
import { OFFER_SOURCE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import type { Offer, OfferStatus } from "@/types/supabase";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface OfferViewerProps {
  offer: Offer | null;
  onStatusChange: (id: string, status: OfferStatus) => Promise<void>;
  onStar: (id: string, starred: boolean) => Promise<void>;
  onApply: (offer: Offer) => void;
}

const td = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
});
td.remove(["script", "style", "button", "img", "input", "form"]);

function htmlToMarkdown(html: string): string {
  try {
    return td.turndown(html);
  } catch {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
}

export function OfferViewer({ offer, onStatusChange, onStar, onApply }: OfferViewerProps) {
  const markdown = useMemo(() => {
    if (!offer?.description) return null;
    return htmlToMarkdown(offer.description);
  }, [offer?.description, offer?.id]);

  if (!offer) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg">
        <div className="text-center">
          <p className="text-sm text-ink-muted">Sélectionne une offre</p>
          <p className="text-xs text-ink-faint mt-1">Le contenu s'affiche ici</p>
        </div>
      </div>
    );
  }

  const scrapedAgo = formatDistanceToNow(new Date(offer.scraped_at), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-bg border-l border-border">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink leading-snug">
              {offer.title}
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">{offer.company}</p>
          </div>

          <div className="shrink-0 flex items-center gap-0.5">
            <button
              onClick={() => void onStar(offer.id, !offer.starred)}
              className={cn(
                "p-1.5 rounded-md transition-colors",
                offer.starred
                  ? "text-amber-500 bg-amber-50"
                  : "text-ink-faint hover:text-ink-muted hover:bg-bg-overlay"
              )}
              title={offer.starred ? "Retirer des suivies" : "Suivre"}
            >
              <Star size={14} fill={offer.starred ? "currentColor" : "none"} />
            </button>
            <a
              href={offer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md text-ink-faint hover:text-ink-muted hover:bg-bg-overlay transition-colors"
              title="Ouvrir l'offre originale"
            >
              <ExternalLink size={14} />
            </a>
            <button
              onClick={() => void onStatusChange(offer.id, "ignored")}
              className="p-1.5 rounded-md text-ink-faint hover:text-ink-muted hover:bg-bg-overlay transition-colors"
              title="Ignorer"
            >
              <EyeOff size={14} />
            </button>
          </div>
        </div>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mt-2.5">
          {offer.location && (
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
              <MapPin size={11} strokeWidth={1.8} />
              {offer.location}
            </span>
          )}
          {offer.salary && (
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
              <Euro size={11} strokeWidth={1.8} />
              {offer.salary}
            </span>
          )}
          {offer.contract_type && (
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
              <Briefcase size={11} strokeWidth={1.8} />
              {offer.contract_type}
            </span>
          )}
          <span className="text-xs text-ink-faint">
            {OFFER_SOURCE_LABELS[offer.source]} · scrapé {scrapedAgo}
          </span>
        </div>
      </div>

      {/* Description markdown */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {markdown ? (
          <div className="prose prose-sm max-w-2xl
            prose-headings:text-ink prose-headings:font-semibold
            prose-p:text-ink-muted prose-p:leading-relaxed
            prose-li:text-ink-muted
            prose-strong:text-ink prose-strong:font-semibold
            prose-h1:text-sm prose-h2:text-sm prose-h3:text-sm
            prose-ul:my-2 prose-li:my-0.5
            prose-hr:border-border
          ">
            <ReactMarkdown>{markdown}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3">
            <p className="text-sm text-ink-muted">
              Pas de description disponible pour cette offre.
            </p>
            <a
              href={offer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
            >
              <ExternalLink size={13} />
              Voir l'offre sur {OFFER_SOURCE_LABELS[offer.source]}
            </a>
          </div>
        )}
      </div>

      {/* CTA bas */}
      <div className="shrink-0 px-6 py-3 border-t border-border flex items-center gap-2">
        {offer.status !== "to_apply" ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void onStatusChange(offer.id, "to_apply")}
          >
            Marquer à postuler
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void onStatusChange(offer.id, "new")}
          >
            Retirer de la liste
          </Button>
        )}
        <Button
          size="sm"
          onClick={() => onApply(offer)}
        >
          <Send size={13} />
          Candidater
        </Button>
      </div>
    </div>
  );
}
