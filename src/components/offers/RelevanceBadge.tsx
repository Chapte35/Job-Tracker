import { cn } from "@/lib/cn";

interface RelevanceBadgeProps {
  score: number | null;
  className?: string;
}

function getColor(score: number): string {
  if (score >= 8) return "bg-emerald-100 text-emerald-700";
  if (score >= 6) return "bg-blue-100 text-blue-700";
  if (score >= 4) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-600";
}

export function RelevanceBadge({ score, className }: RelevanceBadgeProps) {
  if (score === null) return null;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-semibold tabular-nums",
      getColor(score),
      className
    )}>
      {score}/10
    </span>
  );
}
