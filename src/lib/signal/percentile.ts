/** Primeiro índice de `sorted` cujo valor é >= (ou > quando `strict`) `value`. */
function bound(sorted: readonly number[], value: number, strict: boolean): number {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (strict ? sorted[mid] <= value : sorted[mid] < value) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/**
 * Percentil (0–100) de cada valor entre todos os valores conhecidos até aquele dia, inclusive.
 * Empates contam pela metade. Nulo até haver `minHistory` valores: assim nenhum dia enxerga o futuro.
 */
export function expandingPercentile(values: readonly (number | null)[], minHistory: number): (number | null)[] {
  const sorted: number[] = [];
  return values.map((value) => {
    if (value === null || !Number.isFinite(value)) return null;
    sorted.splice(bound(sorted, value, false), 0, value);
    if (sorted.length < minHistory) return null;
    const below = bound(sorted, value, false);
    const equal = bound(sorted, value, true) - below;
    return ((below + equal / 2) / sorted.length) * 100;
  });
}
