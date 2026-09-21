"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Plus, Sparkles } from "lucide-react";
import { useOffers } from "@/hooks/useOffers";
import { OfferRow } from "@/components/offers/OfferRow";
import { OfferViewer } from "@/components/offers/OfferViewer";
import { ScrapeModal } from "@/components/offers/ScrapeModal";
import { ApplyModal } from "@/components/offers/ApplyModal";
import { OFFER_FILTERS, type OfferFilter } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { Offer, OfferStatus } from "@/types/supabase";

type SortMode = "date" | "score";

export default function OffersPage() {
  const [filter, setFilter] = useState<OfferFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("date");
  const [selected, setSelected] = useState<Offer | null>(null);
  const [scrapeOpen, setScrapeOpen] = useState(false);
  const [applyOffer, setApplyOffer] = useState<Offer | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [classifyResult, setClassifyResult] = useState<string | null>(null);

  const { offers, loading, error, refresh, updateStatus, toggleStarred } = useOffers(filter);

  const sortedOffers = [...offers].sort((a, b) => {
    if (sortMode === "score") {
      const sa = a.relevance_score ?? 0;
      const sb = b.relevance_score ?? 0;
      return sb - sa;
    }
    return new Date(b.scraped_at).getTime() - new Date(a.scraped_at).getTime();
  });

  const handleIgnore = async (offer: Offer) => {
    await updateStatus(offer.id, "ignored");
    if (selected?.id === offer.id) setSelected(null);
  };

  const handleStatusChange = async (id: string, status: OfferStatus) => {
    await updateStatus(id, status);
    if (selected?.id === id) {
      setSelected((prev) => prev ? { ...prev, status } : null);
    }
  };

  const handleStar = async (id: string, starred: boolean) => {
    await toggleStarred(id, starred);
    if (selected?.id === id) {
      setSelected((prev) => prev ? { ...prev, starred } : null);
    }
  };

  const handleClassify = async () => {
    setClassifying(true);
    setClassifyResult(null);
    try {
      const res = await fetch("/api/offers/classify", { method: "POST" });
      const data = await res.json() as { classified?: number; message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      setClassifyResult(
        data.message ?? `${data.classified ?? 0} offre(s) classifiée(s)`
      );
      void refresh();
    } catch (err) {
      setClassifyResult(err instanceof Error ? err.message : "Erreur");
    } finally {
      setClassifying(false);
    }
  };

  const unclassifiedCount = offers.filter((o) => o.relevance_score === null).length;

  return (
    <div className="flex h-full">
      {/* Colonne liste */}
      <div className="w-[280px] shrink-0 flex flex-col border-r border-border bg-bg">
        {/* Header */}
        <div className="px-4 h-[52px] flex items-center justify-between shrink-0 border-b border-border">
          <span className="text-sm font-medium text-ink">
            {offers.length} offre{offers.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refresh()}
              title="Rafraîchir"
            >
              <RefreshCw size={13} />
            </Button>
            <Button
              size="sm"
              onClick={() => setScrapeOpen(true)}
            >
              <Plus size={12} />
              Scraper
            </Button>
          </div>
        </div>

        {/* Filtres + tri */}
        <div className="flex gap-0.5 px-3 py-2 border-b border-border overflow-x-auto shrink-0">
          {OFFER_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setSelected(null); }}
              className={cn(
                "shrink-0 px-2.5 py-1 rounded text-xs transition-colors",
                filter === f.id
                  ? "bg-bg-overlay text-ink font-medium"
                  : "text-ink-muted hover:text-ink hover:bg-bg-overlay"
              )}
            >
              {f.label}
            </button>
          ))}
          <div className="w-px bg-border shrink-0 mx-1" />
          <button
            onClick={() => setSortMode((m) => m === "date" ? "score" : "date")}
            className={cn(
              "shrink-0 px-2.5 py-1 rounded text-xs transition-colors",
              sortMode === "score"
                ? "bg-bg-overlay text-ink font-medium"
                : "text-ink-muted hover:text-ink hover:bg-bg-overlay"
            )}
            title="Trier par pertinence"
          >
            {sortMode === "score" ? "↓ Score" : "Score"}
          </button>
        </div>

        {/* Bouton classifier */}
        {unclassifiedCount > 0 && (
          <div className="px-3 py-2 border-b border-border shrink-0">
            <Button
              variant="secondary"
              size="sm"
              className="w-full"
              onClick={() => void handleClassify()}
              disabled={classifying}
            >
              {classifying
                ? <Loader2 size={12} className="animate-spin" />
                : <Sparkles size={12} />
              }
              {classifying
                ? "Classification en cours…"
                : `Classifier ${unclassifiedCount} offre${unclassifiedCount > 1 ? "s" : ""}`
              }
            </Button>
            {classifyResult && (
              <p className="text-2xs text-ink-faint text-center mt-1.5">{classifyResult}</p>
            )}
          </div>
        )}

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={14} className="animate-spin text-ink-faint" />
            </div>
          ) : error ? (
            <p className="px-4 py-3 text-xs text-red-500">{error}</p>
          ) : sortedOffers.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-ink-muted">Aucune offre</p>
              <button
                onClick={() => setScrapeOpen(true)}
                className="mt-2 text-xs text-ink-muted hover:text-ink transition-colors underline underline-offset-2"
              >
                Lancer un scrape
              </button>
            </div>
          ) : (
            sortedOffers.map((offer) => (
              <OfferRow
                key={offer.id}
                offer={offer}
                selected={selected?.id === offer.id}
                onClick={() => setSelected(offer)}
                onStar={(starred) => void handleStar(offer.id, starred)}
                onIgnore={() => void handleIgnore(offer)}
                onApply={() => setApplyOffer(offer)}
              />
            ))
          )}
        </div>
      </div>

      {/* Viewer */}
      <OfferViewer
        offer={selected}
        onStatusChange={handleStatusChange}
        onStar={handleStar}
        onApply={(offer) => setApplyOffer(offer)}
      />

      <ScrapeModal
        open={scrapeOpen}
        onClose={() => setScrapeOpen(false)}
        onSuccess={() => { void refresh(); setScrapeOpen(false); }}
      />

      <ApplyModal
        offer={applyOffer}
        onClose={() => setApplyOffer(null)}
        onSuccess={() => { void refresh(); setApplyOffer(null); }}
      />
    </div>
  );
}
