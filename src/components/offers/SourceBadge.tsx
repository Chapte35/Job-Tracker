import { cn } from "@/lib/cn";
import type { OfferSource } from "@/types/supabase";
import { OFFER_SOURCE_LABELS } from "@/lib/constants";

const SOURCE_STYLES: Record<OfferSource, string> = {
  welcome_to_the_jungle: "border-l-[3px] border-l-violet-500",
  france_travail:        "border-l-[3px] border-l-blue-500",
  linkedin:              "border-l-[3px] border-l-cyan-500",
  indeed:                "border-l-[3px] border-l-orange-400",
  manual:                "border-l-[3px] border-l-border-strong",
};

const SOURCE_DOT: Record<OfferSource, string> = {
  welcome_to_the_jungle: "bg-violet-500",
  france_travail:        "bg-blue-500",
  linkedin:              "bg-cyan-500",
  indeed:                "bg-orange-400",
  manual:                "bg-border-strong",
};

interface SourceBadgeProps {
  source: OfferSource;
  className?: string;
}

export function SourceBadge({ source, className }: SourceBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-ink-muted",
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", SOURCE_DOT[source])} />
      {OFFER_SOURCE_LABELS[source]}
    </span>
  );
}

export function getSourceBorderClass(source: OfferSource): string {
  return SOURCE_STYLES[source];
}
