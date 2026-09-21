"use client";

import { useState } from "react";

interface ScrapeResult {
  inserted: number;
  skipped: number;
  source: string;
  error?: string;
  message?: string;
}

interface UseScrapeReturn {
  scrape: (url: string) => Promise<ScrapeResult | null>;
  loading: boolean;
  error: string | null;
}

export function useScrape(): UseScrapeReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrape = async (url: string): Promise<ScrapeResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = (await res.json()) as ScrapeResult;

      if (!res.ok) {
        setError(data.error ?? `Erreur ${res.status}`);
        return null;
      }

      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur réseau";
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { scrape, loading, error };
}
