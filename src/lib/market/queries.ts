"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDailySeries, fetchKlines, type KlineInterval } from "./client";

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
