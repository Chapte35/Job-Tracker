"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Plus, Sparkles } from "lucide-react";
import { useOffers } from "@/hooks/useOffers";
import { OfferRow } from "@/components/offers/OfferRow";
import { OfferViewer } from "@/components/offers/OfferViewer";
import { ScrapeModal } from "@/components/offers/ScrapeModal";
import { ApplyModal } from "@/components/offers/ApplyModal";
import { OFFER_FILTERS, type OfferFilter } from "@/lib/constants";
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
      <div className="w-80 shrink-0 flex flex-col border-r border-border bg-bg-raised">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
          <span className="text-sm font-semibold text-ink">
            {offers.length} offre{offers.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => void refresh()}
              className="p-1.5 rounded text-ink-faint hover:text-ink-muted hover:bg-bg-overlay transition-colors"
              title="Rafraîchir"
            >
              <RefreshCw size={13} />
            </button>
            <button
              onClick={() => setScrapeOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-accent hover:bg-accent-hover text-white text-xs font-medium transition-colors"
            >
              <Plus size={12} />
              Scraper
            </button>
          </div>
        </div>

        {/* Filtres + tri */}
        <div className="flex gap-1 px-3 py-2 border-b border-border-subtle overflow-x-auto shrink-0">
          {OFFER_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => { setFilter(f.id); setSelected(null); }}
              className={cn(
                "shrink-0 px-2.5 py-1 rounded text-xs transition-colors",
                filter === f.id
                  ? "bg-accent/10 text-accent font-medium"
                  : "text-ink-muted hover:text-ink hover:bg-bg-overlay"
              )}
            >
              {f.label}
            </button>
          ))}
          <div className="w-px bg-border-subtle shrink-0 mx-1" />
          <button
            onClick={() => setSortMode((m) => m === "date" ? "score" : "date")}
            className={cn(
              "shrink-0 px-2.5 py-1 rounded text-xs transition-colors",
              sortMode === "score"
                ? "bg-emerald-50 text-emerald-700 font-medium"
                : "text-ink-muted hover:text-ink hover:bg-bg-overlay"
            )}
            title="Trier par pertinence"
          >
            {sortMode === "score" ? "↓ Score" : "Score"}
          </button>
        </div>

        {/* Bouton classifier */}
        {unclassifiedCount > 0 && (
          <div className="px-3 py-2 border-b border-border-subtle shrink-0">
            <button
              onClick={() => void handleClassify()}
              disabled={classifying}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border border-border text-xs text-ink-muted hover:text-ink hover:border-border-strong transition-colors disabled:opacity-50"
            >
              {classifying
                ? <Loader2 size={12} className="animate-spin" />
                : <Sparkles size={12} />
              }
              {classifying
                ? "Classification en cours…"
                : `Classifier ${unclassifiedCount} offre${unclassifiedCount > 1 ? "s" : ""} via Qwen`
              }
            </button>
            {classifyResult && (
              <p className="text-2xs text-ink-faint text-center mt-1">{classifyResult}</p>
            )}
          </div>
        )}

        {/* Liste */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={16} className="animate-spin text-ink-faint" />
            </div>
          ) : error ? (
            <p className="px-4 py-3 text-xs text-red-500">{error}</p>
          ) : sortedOffers.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-ink-muted">Aucune offre</p>
              <button
                onClick={() => setScrapeOpen(true)}
                className="mt-2 text-xs text-accent hover:text-accent-hover transition-colors"
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
