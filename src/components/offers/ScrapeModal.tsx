"use client";

import { useState, useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import { useScrape } from "@/hooks/useScrape";
import { cn } from "@/lib/cn";

interface ScrapeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PLACEHOLDERS = [
  "wttj",
  "https://www.welcometothejungle.com/fr/jobs?query=react",
  "https://candidat.francetravail.fr/offres/recherche?motsCles=react",
  "https://www.linkedin.com/jobs/search/?keywords=react+developer",
  "https://fr.indeed.com/jobs?q=développeur+react",
];

export function ScrapeModal({ open, onClose, onSuccess }: ScrapeModalProps) {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<{ inserted: number; skipped: number; source: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { scrape, loading, error } = useScrape();

  useEffect(() => {
    if (open) {
      setUrl("");
      setResult(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Fermer avec Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSubmit = async () => {
    if (!url.trim()) return;
    const res = await scrape(url.trim());
    if (res) {
      setResult(res);
      if (res.inserted > 0) onSuccess();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-surface-raised border border-border rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-ink">Scraper des offres</h2>
          <button
            onClick={onClose}
            className="text-ink-muted hover:text-ink transition-colors p-0.5 rounded"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-ink-muted">
              URL de recherche ou source
            </label>
            <input
              ref={inputRef}
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
              placeholder={PLACEHOLDERS[0]}
              className={cn(
                "w-full bg-surface border border-border rounded px-3 py-2",
                "text-sm text-ink placeholder:text-ink-faint",
                "focus:outline-none focus:border-accent transition-colors"
              )}
            />
            <p className="text-xs text-ink-faint leading-relaxed">
              Tape <span className="font-mono text-accent">wttj</span> pour tes jobs-matches,
              ou colle une URL France Travail / LinkedIn / Indeed.
            </p>
          </div>

          {/* Résultat */}
          {result && (
            <div className={cn(
              "rounded px-3 py-2 text-sm",
              result.inserted > 0
                ? "bg-status-interview text-statusText-interview"
                : "bg-surface-overlay text-ink-muted"
            )}>
              {result.inserted > 0
                ? `${result.inserted} offre${result.inserted > 1 ? "s" : ""} ajoutée${result.inserted > 1 ? "s" : ""} depuis ${result.source}.`
                : `0 nouvelles offres (${result.skipped} déjà en base).`
              }
            </div>
          )}

          {error && (
            <div className="rounded px-3 py-2 text-sm bg-status-refused text-statusText-refused">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
          >
            Fermer
          </button>
          <button
            onClick={() => void handleSubmit()}
            disabled={loading || !url.trim()}
            className={cn(
              "flex items-center gap-2 px-4 py-1.5 rounded text-sm font-medium transition-colors",
              "bg-accent hover:bg-accent-hover text-white",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {loading ? "Scrape en cours…" : "Lancer"}
          </button>
        </div>
      </div>
    </div>
  );
}
