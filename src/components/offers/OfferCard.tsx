"use client";

import { MapPin, Euro } from "lucide-react";
import { cn } from "@/lib/cn";
import { SourceBadge, getSourceBorderClass } from "./SourceBadge";
import type { Offer } from "@/types/supabase";

interface OfferCardProps {
  offer: Offer;
  onClick: (offer: Offer) => void;
  isDragging?: boolean;
}

export function OfferCard({ offer, onClick, isDragging }: OfferCardProps) {
  return (
    <button
      type="button"
      onClick={() => onClick(offer)}
      className={cn(
        "w-full text-left bg-surface-raised rounded-md px-3 py-3",
        "border border-border hover:border-border-strong",
        "transition-colors duration-100 cursor-pointer group",
        getSourceBorderClass(offer.source),
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {/* Titre */}
      <p className="text-sm font-medium text-ink leading-snug truncate-2 mb-1">
        {offer.title}
      </p>

      {/* Entreprise */}
      <p className="text-xs text-ink-muted font-medium mb-2 truncate">
        {offer.company}
      </p>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {offer.location && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
            <MapPin size={10} strokeWidth={1.8} />
            {offer.location}
          </span>
        )}
        {offer.salary && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
            <Euro size={10} strokeWidth={1.8} />
            {offer.salary}
          </span>
        )}
      </div>

      {/* Footer */}
      <div className="mt-2.5 pt-2 border-t border-border flex items-center justify-between">
        <SourceBadge source={offer.source} />
        {offer.contract_type && (
          <span className="text-xs text-ink-faint truncate max-w-[100px]">
            {offer.contract_type}
          </span>
        )}
      </div>
    </button>
  );
}
