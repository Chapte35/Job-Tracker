"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Offer, OfferStatus } from "@/types/supabase";
import type { OfferFilter } from "@/lib/constants";

interface UseOffersReturn {
  offers: Offer[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  updateStatus: (id: string, status: OfferStatus) => Promise<void>;
  toggleStarred: (id: string, starred: boolean) => Promise<void>;
}

export function useOffers(filter: OfferFilter = "all"): UseOffersReturn {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("offers")
      .select("*")
      .order("scraped_at", { ascending: false });

    if (filter === "starred") {
      query = query.eq("starred", true);
    } else if (filter === "all") {
      query = query.neq("status", "ignored");
    } else {
      query = query.eq("status", filter);
    }

    const { data, error: err } = await query;

    if (err) setError(err.message);
    else setOffers(data ?? []);
    setLoading(false);
  }, [filter]);

  useEffect(() => { void fetchOffers(); }, [fetchOffers]);

  const updateStatus = useCallback(async (id: string, status: OfferStatus) => {
    setOffers((prev) => prev.map((o) => o.id === id ? { ...o, status } : o));
    const { error: err } = await supabase.from("offers").update({ status }).eq("id", id);
    if (err) { setError(err.message); void fetchOffers(); }
  }, [fetchOffers]);

  const toggleStarred = useCallback(async (id: string, starred: boolean) => {
    setOffers((prev) => prev.map((o) => o.id === id ? { ...o, starred } : o));
    const { error: err } = await supabase.from("offers").update({ starred }).eq("id", id);
    if (err) { setError(err.message); void fetchOffers(); }
  }, [fetchOffers]);

  return { offers, loading, error, refresh: fetchOffers, updateStatus, toggleStarred };
}
