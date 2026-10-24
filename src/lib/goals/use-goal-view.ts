"use client";

import { useLiveTickers } from "@/lib/market/live";
import { BTC_SYMBOL, candleIn } from "@/lib/market/currency";
import { useDailySeries } from "@/lib/market/queries";
import { usePortfolioView } from "@/lib/portfolio/use-portfolio-view";
import { useCurrency, useGoal } from "@/lib/preferences";
import { requiredRise, targetPrice } from "./goal";

/**
 * A Meta aplicada à posição do Visitante, na moeda escolhida. Sem Preço médio informado,
 * usa o preço de hoje como base ("se comprasse agora").
 */
export function useGoalView() {
  const [currency] = useCurrency();
  const [goal, setGoal] = useGoal();
  const daily = useDailySeries();
  const live = useLiveTickers()[BTC_SYMBOL[currency]]?.last;
  const { position } = usePortfolioView();
  const last = daily.data?.at(-1);
  const price = live ?? (last ? candleIn(last, currency).close : undefined);
  const average = position?.averagePrice?.[currency] ?? null;
  const base = average ?? price;
  const target = base === undefined ? undefined : targetPrice(base, goal);
  const rise = target !== undefined && price !== undefined ? requiredRise(target, price) : undefined;
  return {
    currency,
    goal,
    setGoal,
    price,
    /** Preço médio do Visitante, ou null se ele não informou o custo. */
    average,
    target,
    rise,
    /**
     * Alta necessária arredondada a meio ponto percentual, para as estimativas pesadas: o preço ao vivo
     * muda a cada segundo e refazer tudo a cada tique travaria a página sem mudar o resultado.
     */
    stableRise: rise === undefined ? undefined : Math.round(rise * 200) / 200,
    position,
    daily,
  };
}
