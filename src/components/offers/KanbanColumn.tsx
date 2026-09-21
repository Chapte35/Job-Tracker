"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableOfferCard } from "./SortableOfferCard";
import { cn } from "@/lib/cn";
import type { Offer, OfferStatus } from "@/types/supabase";

interface KanbanColumnProps {
  id: OfferStatus;
  label: string;
  offers: Offer[];
  onCardClick: (offer: Offer) => void;
}

export function KanbanColumn({ id, label, offers, onCardClick }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="flex flex-col min-w-0 flex-1">
      {/* Header colonne */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-sm font-medium text-ink">{label}</span>
        <span className="text-xs text-ink-faint bg-surface-overlay px-1.5 py-0.5 rounded">
          {offers.length}
        </span>
      </div>

      {/* Zone droppable */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 flex flex-col gap-2 rounded-lg p-2 min-h-[200px] transition-colors",
          isOver ? "bg-accent-muted/30" : "bg-surface-overlay/40"
        )}
      >
        <SortableContext
          items={offers.map((o) => o.id)}
          strategy={verticalListSortingStrategy}
        >
          {offers.map((offer) => (
            <SortableOfferCard
              key={offer.id}
              offer={offer}
              onCardClick={onCardClick}
            />
          ))}
        </SortableContext>

        {offers.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-xs text-ink-faint">
              {id === "new" ? "Lance un scrape pour remplir ça." : "Glisse des offres ici."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
