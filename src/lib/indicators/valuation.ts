/** preço ÷ referência, dia a dia. Com a média de 200 dias como referência é o Mayer Multiple. */
export function ratioTo(prices: readonly number[], reference: readonly (number | null)[]): (number | null)[] {
  return prices.map((price, i) => {
    const ref = reference[i];
    return ref ? price / ref : null;
  });
}

/** Queda do fechamento em relação à maior máxima já registrada até o dia (0 = no topo; −0,5 = metade abaixo). */
export function drawdown(candles: readonly { high: number; close: number }[]): number[] {
  let peak = -Infinity;
  return candles.map(({ high, close }) => {
    peak = Math.max(peak, high);
    return close / peak - 1;
  });
}

// Datas (UTC) dos halvings, quando a recompensa por bloco cai pela metade.
export const HALVINGS = [
  Date.UTC(2012, 10, 28),
  Date.UTC(2016, 6, 9),
  Date.UTC(2020, 4, 11),
  Date.UTC(2024, 3, 20),
] as const;

const TOP_WINDOW_DAYS = 730;

export type CycleStats = {
  cycle: number;
  halving: number;
  /** Fechamento no dia do halving. */
  halvingPrice: number;
  /** Dias do halving até o Topo do ciclo. */
  topDays: number;
  /** Topo do ciclo ÷ preço do halving. */
  topMultiple: number;
  /** Fechamento no mesmo número de dias desde o halving em que o ciclo atual está ÷ preço do halving. */
  sameDayMultiple: number | null;
};

/**
 * Um resumo por ciclo de halving coberto pelos candles, o último sendo o ciclo atual.
 * `candles` precisa ser diário e contínuo (um candle por dia).
 */
export function cycleComparison(
  candles: readonly { time: number; high: number; close: number }[],
  halvings: readonly number[] = HALVINGS,
): CycleStats[] {
  const indexOf = new Map(candles.map((c, i) => [c.time, i]));
  const last = candles.at(-1);
  const starts = halvings.map((h) => indexOf.get(h));
  const currentStart = starts.findLast((s) => s !== undefined);
  if (!last || currentStart === undefined) return [];
  const daysNow = candles.length - 1 - currentStart;

  return halvings.flatMap((halving, i) => {
    const begin = starts[i];
    if (begin === undefined) return [];
    const end = starts[i + 1] ?? candles.length;
    // Topo = maior máxima nos dois primeiros anos depois do halving: nos ciclos anteriores o topo veio
    // entre 12 e 18 meses, e um recorde às vésperas do halving seguinte não deve passar por topo do ciclo.
    const topEnd = Math.min(end, begin + TOP_WINDOW_DAYS);
    let top = begin;
    for (let j = begin; j < topEnd; j++) if (candles[j].high > candles[top].high) top = j;
    const halvingPrice = candles[begin].close;
    const same = begin + daysNow < end ? candles[begin + daysNow].close / halvingPrice : null;
    return [{
      cycle: i + 1,
      halving,
      halvingPrice,
      topDays: top - begin,
      topMultiple: candles[top].high / halvingPrice,
      sameDayMultiple: same,
    }];
  });
}
