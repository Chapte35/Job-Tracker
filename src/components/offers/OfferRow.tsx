"use client";

import { Star, EyeOff, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import { OFFER_SOURCE_LABELS, OFFER_SOURCE_DOT } from "@/lib/constants";
import { RelevanceBadge } from "./RelevanceBadge";
import type { Offer } from "@/types/supabase";

interface OfferRowProps {
  offer: Offer;
  selected: boolean;
  onClick: () => void;
  onStar: (starred: boolean) => void;
  onIgnore: () => void;
  onApply: () => void;
}

const STATUS_PILL: Record<string, string> = {
  new:      "bg-bg-overlay text-ink-muted",
  to_apply: "bg-accent/10 text-accent",
  ignored:  "bg-bg-overlay text-ink-faint",
};

const STATUS_LABEL: Record<string, string> = {
  new:      "Nouvelle",
  to_apply: "À postuler",
  ignored:  "Ignorée",
};

export function OfferRow({ offer, selected, onClick, onStar, onIgnore, onApply }: OfferRowProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "group flex items-start gap-3 px-4 py-3 cursor-pointer border-b border-border-subtle",
        "transition-colors hover:bg-bg-overlay",
        selected && "bg-accent/5 border-l-2 border-l-accent"
      )}
    >
      {/* Source dot */}
      <div className="shrink-0 mt-1.5">
        <span className={cn("block w-2 h-2 rounded-full", OFFER_SOURCE_DOT[offer.source])} />
      </div>

      {/* Contenu */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium text-ink leading-snug truncate-2">
            {offer.title}
          </p>
          {/* Actions au hover */}
          <div className={cn(
            "shrink-0 flex items-center gap-1 transition-opacity",
            "opacity-0 group-hover:opacity-100",
            selected && "opacity-100"
          )}>
            <button
              onClick={(e) => { e.stopPropagation(); onStar(!offer.starred); }}
              className={cn(
                "p-1 rounded transition-colors",
                offer.starred ? "text-amber-500" : "text-ink-faint hover:text-ink-muted"
              )}
              title={offer.starred ? "Retirer des suivies" : "Suivre"}
            >
              <Star size={13} fill={offer.starred ? "currentColor" : "none"} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onApply(); }}
              className="p-1 rounded text-ink-faint hover:text-accent transition-colors"
              title="Candidater"
            >
              <Send size={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onIgnore(); }}
              className="p-1 rounded text-ink-faint hover:text-ink-muted transition-colors"
              title="Ignorer"
            >
              <EyeOff size={13} />
            </button>
          </div>
        </div>

        <p className="text-xs text-ink-muted mt-0.5 truncate">{offer.company}</p>

        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {offer.location && (
            <span className="text-2xs text-ink-faint truncate max-w-[120px]">
              {offer.location}
            </span>
          )}
          {offer.salary && (
            <span className="text-2xs text-ink-faint">{offer.salary}</span>
          )}
          <span className={cn(
            "text-2xs px-1.5 py-0.5 rounded-sm font-medium",
            STATUS_PILL[offer.status]
          )}>
            {STATUS_LABEL[offer.status]}
          </span>
          <span className="text-2xs text-ink-faint">
            {OFFER_SOURCE_LABELS[offer.source]}
          </span>
          <RelevanceBadge score={offer.relevance_score} />
        </div>

        {/* Résumé pertinence si dispo */}
        {offer.relevance_summary && (
          <p className="text-2xs text-ink-faint mt-1 truncate-2 leading-relaxed">
            {offer.relevance_summary}
          </p>
        )}
      </div>
    </div>
  );
}
