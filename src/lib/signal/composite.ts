import { ZONE_LIMITS } from "@/config/signal-weights";

export type Zone = "compra" | "neutro" | "venda";

export type ScorePoint<K extends string> = {
  /** 0 (barato) a 100 (caro). */
  score: number;
  /** Quanto cada indicador somou no total; só os que tinham nota no dia. */
  contributions: Partial<Record<K, number>>;
};

/**
 * Sinal composto dia a dia: média ponderada das Notas disponíveis, com o peso dos indicadores
 * sem nota redistribuído entre os demais.
 */
export function compositeScore<K extends string>(
  notes: Record<K, readonly (number | null)[]>,
  weights: Record<K, number>,
  minWeightFraction: number,
): (ScorePoint<K> | null)[] {
  const keys = Object.keys(weights) as K[];
  const total = keys.reduce((sum, k) => sum + weights[k], 0);
  const days = Math.max(...keys.map((k) => notes[k].length));
  return Array.from({ length: days }, (_, i) => {
    const available = keys.filter((k) => notes[k][i] !== null && notes[k][i] !== undefined);
    const weight = available.reduce((sum, k) => sum + weights[k], 0);
    if (weight < total * minWeightFraction) return null;
    const contributions: Partial<Record<K, number>> = {};
    let score = 0;
    for (const k of available) {
      const part = (notes[k][i]! * weights[k]) / weight;
      contributions[k] = part;
      score += part;
    }
    return { score, contributions };
  });
}

export function zoneOf(score: number): Zone {
  if (score < ZONE_LIMITS.buyBelow) return "compra";
  if (score > ZONE_LIMITS.sellAbove) return "venda";
  return "neutro";
}
