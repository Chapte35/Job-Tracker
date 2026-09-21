"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { OfferCard } from "./OfferCard";
import type { Offer } from "@/types/supabase";

interface SortableOfferCardProps {
  offer: Offer;
  onCardClick: (offer: Offer) => void;
}

export function SortableOfferCard({ offer, onCardClick }: SortableOfferCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: offer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <OfferCard offer={offer} onClick={onCardClick} isDragging={isDragging} />
    </div>
  );
}
