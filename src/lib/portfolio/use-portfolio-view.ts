"use client";

import { useMemo } from "react";
import { useLiveTickers } from "@/lib/market/live";
import { useDailySeries } from "@/lib/market/queries";
import { useBinanceBalance } from "./binance";
import { computePosition, valuation, type CostInput, type Money } from "./position";
import { usePortfolio } from "./store";

const NO_COST: CostInput = { kind: "aportes", aportes: [], vendas: [] };

/** Tudo o que as telas precisam da posição do Visitante, já combinado com o preço atual. */
export function usePortfolioView() {
  const state = usePortfolio();
  const stored = state.status === "ready" ? state.data : null;
  const daily = useDailySeries();
  const isBinance = stored?.source === "binance";
  const balance = useBinanceBalance(isBinance);
  const tickers = useLiveTickers();

  const held = isBinance ? balance.data?.total : stored?.btc;
  const position = useMemo(() => {
    if (!stored || !daily.data || (isBinance && held === undefined)) return null;
    return computePosition(stored.cost ?? NO_COST, daily.data, held);
  }, [stored, daily.data, isBinance, held]);

  const last = daily.data?.at(-1);
  const brl = tickers.BTCBRL?.last ?? last?.brl.close;
  const usd = tickers.BTCUSDT?.last ?? last?.usd.close;
  const price: Money | null = brl && usd ? { BRL: brl, USD: usd } : null;
  const value = position && price ? valuation(position, price) : null;

  return {
    /** Ainda lendo o IndexedDB, os preços ou o saldo da Binance. */
    loading: state.status === "loading" || daily.isPending || (isBinance && balance.isPending),
    /** O IndexedDB ainda não respondeu: não dá para saber se o Visitante já informou algo. */
    storeLoading: state.status === "loading",
    persisted: state.status === "ready" ? state.persisted : true,
    stored,
    balance,
    position,
    valuation: value,
    price,
    daily: daily.data,
  };
}
