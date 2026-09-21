"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Send, Settings, Sun, Moon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/hooks/useTheme";

const NAV_ITEMS = [
  { href: "/offers",       label: "Offres",       icon: Briefcase },
  { href: "/applications", label: "Candidatures", icon: Send },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { dark, toggle } = useTheme();

  return (
    <aside className="w-[200px] shrink-0 flex flex-col border-r border-border bg-bg h-screen">
      {/* Logo */}
      <div className="px-4 h-[52px] flex items-center border-b border-border">
        <span className="text-sm font-semibold tracking-tight text-ink">
          job<span className="text-ink-muted font-normal">tracker</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-2 px-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-bg-overlay text-ink font-medium"
                  : "text-ink-muted hover:text-ink hover:bg-bg-overlay"
              )}
            >
              <Icon size={14} strokeWidth={1.8} className={active ? "text-ink" : "text-ink-faint"} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-2 py-2 border-t border-border flex flex-col gap-0.5">
        <button
          onClick={toggle}
          className="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm text-ink-muted hover:text-ink hover:bg-bg-overlay transition-colors w-full text-left"
        >
          {dark
            ? <Sun size={14} strokeWidth={1.8} className="text-ink-faint" />
            : <Moon size={14} strokeWidth={1.8} className="text-ink-faint" />
          }
          {dark ? "Mode clair" : "Mode sombre"}
        </button>
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
            pathname === "/settings"
              ? "bg-bg-overlay text-ink font-medium"
              : "text-ink-muted hover:text-ink hover:bg-bg-overlay"
          )}
        >
          <Settings size={14} strokeWidth={1.8} className="text-ink-faint" />
          Paramètres
        </Link>
      </div>
    </aside>
  );
}
