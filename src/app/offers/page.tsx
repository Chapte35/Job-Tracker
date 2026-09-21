"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Loader2, RefreshCw, Plus, Sparkles, ChevronDown, ArrowUpDown } from "lucide-react";
import { useOffers } from "@/hooks/useOffers";
import { OfferRow } from "@/components/offers/OfferRow";
import { OfferViewer } from "@/components/offers/OfferViewer";
import { ScrapeModal } from "@/components/offers/ScrapeModal";
import { ApplyModal } from "@/components/offers/ApplyModal";
import { OFFER_FILTERS, OFFER_SOURCE_LABELS, type OfferFilter } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { Offer, OfferSource, OfferStatus } from "@/types/supabase";

// ─── Tri ──────────────────────────────────────────────────────────────────────

type SortField = "date" | "score" | "company" | "source";
type SortDir = "asc" | "desc";

interface SortMode {
  field: SortField;
  dir: SortDir;
}

const SORT_OPTIONS: { field: SortField; label: string; defaultDir: SortDir }[] = [
  { field: "date",    label: "Date",       defaultDir: "desc" },
  { field: "score",   label: "Score",      defaultDir: "desc" },
  { field: "company", label: "Entreprise", defaultDir: "asc"  },
  { field: "source",  label: "Source",     defaultDir: "asc"  },
];

function sortOffers(offers: Offer[], { field, dir }: SortMode): Offer[] {
  return [...offers].sort((a, b) => {
    let cmp = 0;
    if (field === "date") {
      cmp = new Date(a.scraped_at).getTime() - new Date(b.scraped_at).getTime();
    } else if (field === "score") {
      cmp = (a.relevance_score ?? -1) - (b.relevance_score ?? -1);
    } else if (field === "company") {
      cmp = (a.company ?? "").localeCompare(b.company ?? "", "fr", { sensitivity: "base" });
    } else if (field === "source") {
      cmp = (a.source ?? "").localeCompare(b.source ?? "", "fr", { sensitivity: "base" });
    }
    return dir === "desc" ? -cmp : cmp;
  });
}

// ─── Filtre département/ville ─────────────────────────────────────────────────
// Extrait le numéro de département (si "DD - Ville") ou normalise la ville.
function extractDept(location: string | null): string | null {
  if (!location) return null;
  const m = location.match(/^(\d{2,3})\s*[-–]/);
  if (m) return m[1];
  return null;
}

function matchesDeptFilter(offer: Offer, deptFilter: string): boolean {
  if (!deptFilter) return true;
  const loc = (offer.location ?? "").toLowerCase();
  const dept = extractDept(offer.location);
  const needle = deptFilter.toLowerCase();
  // Correspond si le numéro de dept matche OU si la ville matche
  return dept === deptFilter || loc.includes(needle);
}

// ─── Dropdown tri ─────────────────────────────────────────────────────────────

function SortPicker({ sort, onChange }: { sort: SortMode; onChange: (s: SortMode) => void }) {
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find((o) => o.field === sort.field);

  const handleField = (field: SortField, defaultDir: SortDir) => {
    onChange(sort.field === field ? { field, dir: sort.dir === "asc" ? "desc" : "asc" } : { field, dir: defaultDir });
    setOpen(false);
  };

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1 rounded text-xs transition-colors",
          open ? "bg-bg-overlay text-ink font-medium" : "text-ink-muted hover:text-ink hover:bg-bg-overlay"
        )}
      >
        <ArrowUpDown size={11} />
        {current?.label ?? "Tri"}
        <span className="text-ink-faint text-[10px]">{sort.dir === "desc" ? "↓" : "↑"}</span>
        <ChevronDown size={10} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-bg border border-border rounded-lg shadow-md py-1 min-w-[140px]">
            {SORT_OPTIONS.map(({ field, label, defaultDir }) => {
              const active = sort.field === field;
              return (
                <button
                  key={field}
                  onClick={() => handleField(field, defaultDir)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors",
                    active ? "text-ink font-medium bg-bg-overlay" : "text-ink-muted hover:text-ink hover:bg-bg-overlay"
                  )}
                >
                  <span>{label}</span>
                  {active && <span className="text-ink-faint text-[10px] ml-4">{sort.dir === "desc" ? "↓" : "↑"}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Resize handle ─────────────────────────────────────────────────────────────

const MIN_LIST_W = 200;
const MAX_LIST_W = 520;
const DEFAULT_LIST_W = 280;

function useResizable() {
  const [listWidth, setListWidth] = useState(DEFAULT_LIST_W);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(DEFAULT_LIST_W);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = listWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [listWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      setListWidth(Math.min(MAX_LIST_W, Math.max(MIN_LIST_W, startW.current + delta)));
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return { listWidth, onMouseDown };
}

// ─── Page principale ───────────────────────────────────────────────────────────

export default function OffersPage() {
  const [filter, setFilter] = useState<OfferFilter>("all");
  const [sort, setSort] = useState<SortMode>({ field: "date", dir: "desc" });
  const [sourceFilter, setSourceFilter] = useState<OfferSource | "all">("all");
  const [deptFilter, setDeptFilter] = useState("");
  const [selected, setSelected] = useState<Offer | null>(null);
  const [scrapeOpen, setScrapeOpen] = useState(false);
  const [applyOffer, setApplyOffer] = useState<Offer | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [classifyResult, setClassifyResult] = useState<string | null>(null);

  const { offers, loading, error, refresh, updateStatus, toggleStarred } = useOffers(filter);
  const { listWidth, onMouseDown } = useResizable();

  // Filtres locaux (source + département) appliqués côté client
  const filteredOffers = offers.filter((o) => {
    if (sourceFilter !== "all" && o.source !== sourceFilter) return false;
    if (deptFilter && !matchesDeptFilter(o, deptFilter)) return false;
    return true;
  });

  const sortedOffers = sortOffers(filteredOffers, sort);

  // Sources disponibles dans le jeu actuel (pour le dropdown)
  const availableSources = Array.from(new Set(offers.map((o) => o.source)));

  const handleIgnore = async (offer: Offer) => {
    await updateStatus(offer.id, "ignored");
    if (selected?.id === offer.id) setSelected(null);
  };

  const handleStatusChange = async (id: string, status: OfferStatus) => {
    await updateStatus(id, status);
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, status } : null);
  };

  const handleStar = async (id: string, starred: boolean) => {
    await toggleStarred(id, starred);
    if (selected?.id === id) setSelected((prev) => prev ? { ...prev, starred } : null);
  };

  const handleClassify = async () => {
    setClassifying(true);
    setClassifyResult(null);
    try {
      const res = await fetch("/api/offers/classify", { method: "POST" });
      const data = await res.json() as { classified?: number; message?: string; error?: string };
      if (!res.ok) throw new Error(data.error ?? `Erreur ${res.status}`);
      setClassifyResult(data.message ?? `${data.classified ?? 0} offre(s) classifiée(s)`);
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
      {/* ── Colonne liste (largeur ajustable) ── */}
      <div
        className="shrink-0 flex flex-col border-r border-border bg-bg"
        style={{ width: listWidth }}
      >
        {/* Header */}
        <div className="px-4 h-[52px] flex items-center justify-between shrink-0 border-b border-border">
          <span className="text-sm font-medium text-ink">
            {sortedOffers.length}
            {sortedOffers.length !== offers.length && (
              <span className="text-ink-faint">/{offers.length}</span>
            )}{" "}
            offre{offers.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => void refresh()} title="Rafraîchir">
              <RefreshCw size={13} />
            </Button>
            <Button size="sm" onClick={() => setScrapeOpen(true)}>
              <Plus size={12} />
              Scraper
            </Button>
          </div>
        </div>

        {/* Filtres statut */}
        <div className="flex items-center gap-0.5 px-3 py-2 border-b border-border shrink-0">
          <div className="flex gap-0.5 overflow-x-auto flex-1 min-w-0">
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
          </div>
          <div className="w-px bg-border shrink-0 mx-1 self-stretch" />
          <SortPicker sort={sort} onChange={setSort} />
        </div>

        {/* Filtres source + département */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border shrink-0">
          {/* Source */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as OfferSource | "all")}
            className="flex-1 text-xs px-2 py-1 rounded-md border border-border bg-bg text-ink-muted focus:outline-none focus:ring-1 focus:ring-accent appearance-none cursor-pointer"
          >
            <option value="all">Toutes sources</option>
            {availableSources.map((s) => (
              <option key={s} value={s}>{OFFER_SOURCE_LABELS[s]}</option>
            ))}
          </select>

          {/* Département / ville */}
          <input
            type="text"
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            placeholder="Dept / ville"
            className="w-[90px] text-xs px-2 py-1 rounded-md border border-border bg-bg text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent"
            title="Filtrer par département (ex: 35) ou ville (ex: Rennes)"
          />
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
              {classifying ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
              {classifying
                ? "Classification en cours…"
                : `Classifier ${unclassifiedCount} offre${unclassifiedCount > 1 ? "s" : ""}`}
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
              {(deptFilter || sourceFilter !== "all") && (
                <button
                  onClick={() => { setDeptFilter(""); setSourceFilter("all"); }}
                  className="mt-2 text-xs text-ink-muted hover:text-ink transition-colors underline underline-offset-2"
                >
                  Réinitialiser les filtres
                </button>
              )}
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

      {/* ── Handle de resize ── */}
      <div
        onMouseDown={onMouseDown}
        className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-accent/40 transition-colors active:bg-accent/60 z-10"
        title="Redimensionner"
      />

      {/* ── Viewer ── */}
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
