import { zoneOf, type Zone } from "./composite";

export type HorizonStats = {
  count: number;
  /** Retorno mediano N dias depois (fração). */
  median: number;
  /** Pior retorno observado. */
  worst: number;
  /** Fração dos casos que terminaram no positivo. */
  positiveShare: number;
};

export type BacktestResult = Record<Zone, Record<number, HorizonStats | null>>;

function stats(returns: number[]): HorizonStats | null {
  if (returns.length === 0) return null;
  const sorted = [...returns].sort((a, b) => a - b);
  const mid = sorted.length >> 1;
  return {
    count: sorted.length,
    median: sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2,
    worst: sorted[0],
    positiveShare: sorted.filter((r) => r > 0).length / sorted.length,
  };
}

/**
 * Para cada zona do Sinal composto, o que aconteceu com o preço N dias depois.
 * O sinal de cada dia já precisa ter sido calculado só com o passado daquele dia.
 */
export function backtestZones(
  closes: readonly number[],
  scores: readonly (number | null)[],
  horizons: readonly number[],
): BacktestResult {
  const result = { compra: {}, neutro: {}, venda: {} } as BacktestResult;
  for (const h of horizons) {
    const byZone: Record<Zone, number[]> = { compra: [], neutro: [], venda: [] };
    for (let i = 0; i + h < closes.length; i++) {
      const score = scores[i];
      if (score === null) continue;
      byZone[zoneOf(score)].push(closes[i + h] / closes[i] - 1);
    }
    for (const zone of ["compra", "neutro", "venda"] as const) result[zone][h] = stats(byZone[zone]);
  }
  return result;
}
