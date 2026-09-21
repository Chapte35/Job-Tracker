"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useScrape } from "@/hooks/useScrape";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface ScrapeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

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

  const handleSubmit = async () => {
    if (!url.trim()) return;
    const res = await scrape(url.trim());
    if (res) {
      setResult(res);
      if (res.inserted > 0) onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b border-border mb-0">
          <DialogTitle>Scraper des offres</DialogTitle>
          <DialogDescription>
            Tape <span className="font-mono text-ink bg-bg-overlay px-1 rounded text-xs">wttj</span> pour tes
            jobs-matches, ou colle une URL France Travail / LinkedIn / Indeed.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 flex flex-col gap-3">
          <Input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleSubmit(); }}
            placeholder="wttj  ou  https://candidat.francetravail.fr/…"
          />

          {result && (
            <div className={cn(
              "rounded-md px-3 py-2 text-xs",
              result.inserted > 0
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-bg-overlay text-ink-muted border border-border"
            )}>
              {result.inserted > 0
                ? `${result.inserted} offre${result.inserted > 1 ? "s" : ""} ajoutée${result.inserted > 1 ? "s" : ""} depuis ${result.source}.`
                : `0 nouvelles offres (${result.skipped} déjà en base).`
              }
            </div>
          )}

          {error && (
            <div className="rounded-md px-3 py-2 text-xs bg-red-50 text-red-700 border border-red-200">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="px-5 py-3 border-t border-border mt-0">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fermer
          </Button>
          <Button
            size="sm"
            onClick={() => void handleSubmit()}
            disabled={loading || !url.trim()}
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            {loading ? "Scrape en cours…" : "Lancer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
