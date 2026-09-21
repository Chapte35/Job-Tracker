import { cn } from "@/lib/cn";

interface RelevanceBadgeProps {
  score: number | null;
  className?: string;
}

/**
 * Seuils cohérents avec ScoreBadge dans OfferAiPanel :
 *  ≥ 7  → vert  (bon match)
 *  ≥ 4  → amber (match partiel)
 *  < 4  → rouge (hors cible)
 *  null → non affiché
 */
function getStyle(score: number): {
  badge: string;
  dot: string;
} {
  if (score >= 7)
    return {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
      dot: "bg-emerald-500",
    };
  if (score >= 4)
    return {
      badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
      dot: "bg-amber-500",
    };
  return {
    badge: "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
    dot: "bg-red-500",
  };
}

export function RelevanceBadge({ score, className }: RelevanceBadgeProps) {
  if (score === null) return null;

  const { badge, dot } = getStyle(score);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-medium tabular-nums border",
        badge,
        className
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
      {score}/10
    </span>
  );
}
