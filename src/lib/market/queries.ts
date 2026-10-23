"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { analyze, type Analysis } from "@/lib/signal/analysis";
import { fetchDailySeries, fetchKlines, type KlineInterval } from "./client";
import { fetchFearGreed } from "./fear-greed";
import type { DailyPoint } from "./series";

export function useDailySeries() {
  return useQuery({
    queryKey: ["daily-series"],
    queryFn: ({ signal }) => fetchDailySeries(signal),
    staleTime: 10 * 60_000,
  });
}

/** Candles intradiários de BTC nas duas moedas, para as visões 1D e 1S. */
export function useIntraday(interval: KlineInterval, sinceMs: number, enabled: boolean) {
  return useQuery({
    queryKey: ["intraday", interval, sinceMs],
    enabled,
    staleTime: 60_000,
    queryFn: async ({ signal }) => {
      const startTime = Date.now() - sinceMs;
      const [usd, brl] = await Promise.all([
        fetchKlines("BTCUSDT", interval, startTime, signal),
        fetchKlines("BTCBRL", interval, startTime, signal),
      ]);
      return { usd, brl };
    },
  });
}

export function useFearGreed() {
  return useQuery({
    queryKey: ["fear-greed"],
    queryFn: ({ signal }) => fetchFearGreed(signal),
    staleTime: 60 * 60_000,
  });
}

// Várias seções da página usam a mesma análise; calculamos uma vez por par de dados.
let cached: { daily: DailyPoint[]; fng: Map<number, number> | undefined; result: Analysis } | null = null;

function analyzeOnce(daily: DailyPoint[], fng: Map<number, number> | undefined): Analysis {
  if (cached?.daily !== daily || cached.fng !== fng) {
    cached = { daily, fng, result: analyze(daily.map((p) => p.usd), fng ?? new Map()) };
  }
  return cached.result;
}

/**
 * Indicadores e Sinal composto sobre a série em USD (a mais longa).
 * Espera o Fear & Greed responder; se a API falhar, o sinal sai com o peso dele redistribuído.
 */
export function useAnalysis() {
  const daily = useDailySeries();
  const fng = useFearGreed();
  const ready = daily.data !== undefined && !fng.isPending;
  const analysis = useMemo(
    () => (ready ? analyzeOnce(daily.data!, fng.data) : undefined),
    [ready, daily.data, fng.data],
  );
  return { daily, fng, analysis, isPending: daily.isPending || fng.isPending, error: daily.error };
}
