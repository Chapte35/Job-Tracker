import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:   "bg-bg-overlay text-ink border border-border",
        secondary: "bg-bg-overlay text-ink-muted border border-border",
        success:   "bg-emerald-50 text-emerald-700 border border-emerald-200",
        warning:   "bg-amber-50 text-amber-700 border border-amber-200",
        danger:    "bg-red-50 text-red-700 border border-red-200",
        ghost:     "bg-transparent text-ink-muted",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
