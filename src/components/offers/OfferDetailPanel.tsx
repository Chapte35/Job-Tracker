"use client";

import { X, ExternalLink, MapPin, Euro, Briefcase, EyeOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { SourceBadge } from "./SourceBadge";
import type { Offer, OfferStatus } from "@/types/supabase";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface OfferDetailPanelProps {
  offer: Offer | null;
  onClose: () => void;
  onStatusChange: (id: string, status: OfferStatus) => Promise<void>;
}

export function OfferDetailPanel({ offer, onClose, onStatusChange }: OfferDetailPanelProps) {
  if (!offer) return null;

  const scrapedAgo = formatDistanceToNow(new Date(offer.scraped_at), {
    addSuffix: true,
    locale: fr,
  });

  return (
    <>
      {/* Backdrop mobile */}
      <div
        className="fixed inset-0 z-30 bg-black/40 lg:hidden"
        onClick={onClose}
      />

      {/* Panel */}
      <aside className={cn(
        "fixed right-0 top-0 h-full z-40",
        "w-full max-w-md bg-surface-raised border-l border-border",
        "flex flex-col shadow-2xl",
        "animate-in slide-in-from-right duration-200"
      )}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-4 py-4 border-b border-border shrink-0">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-ink leading-snug">
              {offer.title}
            </h2>
            <p className="text-xs text-ink-muted mt-0.5 font-medium">{offer.company}</p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-ink-muted hover:text-ink transition-colors p-0.5 rounded mt-0.5"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body scrollable */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4">
          {/* Meta */}
          <div className="flex flex-wrap gap-3">
            <SourceBadge source={offer.source} />
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
          </div>

          {/* Date */}
          <p className="text-xs text-ink-faint">Scrapé {scrapedAgo}</p>

          {/* Description */}
          {offer.description ? (
            <div className="text-sm text-ink-muted leading-relaxed whitespace-pre-wrap">
              {offer.description}
            </div>
          ) : (
            <div className="rounded-md bg-surface-overlay px-3 py-3 text-xs text-ink-faint">
              Pas de description disponible — ouvre l'offre pour lire le détail.
            </div>
          )}

          {/* Lien externe */}
          <a
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            <ExternalLink size={12} />
            Voir l'offre originale
          </a>
        </div>

        {/* Actions */}
        <div className="shrink-0 px-4 py-4 border-t border-border flex flex-col gap-2">
          {offer.status === "new" && (
            <button
              onClick={() => void onStatusChange(offer.id, "to_apply")}
              className="w-full py-2 rounded bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors"
            >
              Marquer à postuler
            </button>
          )}
          {offer.status === "to_apply" && (
            <button
              onClick={() => void onStatusChange(offer.id, "new")}
              className="w-full py-2 rounded bg-surface-overlay hover:bg-border text-ink-muted text-sm transition-colors"
            >
              Remettre en nouvelles
            </button>
          )}
          <button
            onClick={() => { void onStatusChange(offer.id, "ignored"); onClose(); }}
            className="w-full py-2 rounded text-ink-faint hover:text-statusText-refused text-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <EyeOff size={13} />
            Ignorer cette offre
          </button>
        </div>
      </aside>
    </>
  );
}
