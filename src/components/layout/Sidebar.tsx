"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Send, Settings, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/hooks/useTheme";

const NAV_ITEMS = [
  { href: "/offers",       label: "Offres",        icon: Briefcase },
  { href: "/applications", label: "Candidatures",  icon: Send },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { dark, toggle } = useTheme();

  return (
    <aside className="w-48 shrink-0 flex flex-col border-r border-border bg-bg-raised">
      <div className="px-4 py-4 border-b border-border">
        <span className="text-sm font-semibold text-ink tracking-tight">
          job<span className="text-accent">tracker</span>
        </span>
      </div>

      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded text-sm transition-colors",
                active
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-ink-muted hover:text-ink hover:bg-bg-overlay"
              )}
            >
              <Icon size={14} strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-3 border-t border-border flex flex-col gap-0.5">
        <button
          onClick={toggle}
          className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-ink-muted hover:text-ink hover:bg-bg-overlay transition-colors w-full text-left"
        >
          {dark ? <Sun size={14} strokeWidth={1.8} /> : <Moon size={14} strokeWidth={1.8} />}
          {dark ? "Mode clair" : "Mode sombre"}
        </button>
        <Link
          href="/settings"
          className="flex items-center gap-2.5 px-3 py-2 rounded text-sm text-ink-muted hover:text-ink hover:bg-bg-overlay transition-colors"
        >
          <Settings size={14} strokeWidth={1.8} />
          Paramètres
        </Link>
      </div>
    </aside>
  );
}
