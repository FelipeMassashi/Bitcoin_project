/**
 * Para cada dia, quantos dias o fechamento levou para subir `rise` (algum fechamento tocar o alvo).
 * `null`: o prazo de `horizon` dias passou inteiro sem tocar. `undefined`: o prazo ainda não cabe
 * na série. Quem entra é decidido pela data, nunca pelo resultado: se os dias recentes que já
 * tocaram entrassem, sobrariam só os casos de sucesso e as estimativas ficariam otimistas.
 */
export function daysToRise(closes: readonly number[], rise: number, horizon: number): (number | null | undefined)[] {
  const last = closes.length - 1;
  return closes.map((close, i) => {
    if (i + horizon > last) return undefined;
    const target = close * (1 + rise);
    for (let j = i + 1; j <= i + horizon; j++) if (closes[j] >= target) return j - i;
    return null;
  });
}

export type TimeToTargetStats = {
  /** Dias com resultado conhecido. */
  samples: number;
  /** Percentis em dias; null quando caem nos casos que não chegaram dentro do prazo. */
  p25: number | null;
  p50: number | null;
  p80: number | null;
  /** Fração dos casos que não chegaram em `withinDays` dias. */
  neverWithin: number;
  /** Dias até tocar, dos casos que tocaram (para o histograma). */
  reached: number[];
};

/** Resumo de `daysToRise`, só nos dias que `include` aceitar (condições parecidas com as de hoje). */
export function timeToTargetStats(
  days: readonly (number | null | undefined)[],
  withinDays: number,
  include: (index: number) => boolean = () => true,
): TimeToTargetStats {
  const known: number[] = [];
  days.forEach((d, i) => {
    if (d !== undefined && include(i)) known.push(d ?? Infinity);
  });
  known.sort((a, b) => a - b);
  // Percentil por posição mais próxima: "em P% dos casos levou até X dias".
  const pct = (p: number) => {
    if (known.length === 0) return null;
    const v = known[Math.max(0, Math.ceil(p * known.length) - 1)];
    return Number.isFinite(v) ? v : null;
  };
  return {
    samples: known.length,
    p25: pct(0.25),
    p50: pct(0.5),
    p80: pct(0.8),
    neverWithin: known.length ? known.filter((d) => d > withinDays).length / known.length : 0,
    reached: known.filter(Number.isFinite),
  };
}
