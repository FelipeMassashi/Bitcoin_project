/** Retornos logarítmicos diários: ln(fechamento ÷ fechamento anterior). */
export function logReturns(closes: readonly number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) out.push(Math.log(closes[i] / closes[i - 1]));
  return out;
}

/** Gerador pseudoaleatório com seed (mulberry32): mesma seed, mesmas trajetórias. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Band = { p10: number; p25: number; p50: number; p75: number; p90: number };

export type MonteCarloInput = {
  /** Retornos diários da amostra histórica. */
  returns: readonly number[];
  horizonDays: number;
  paths: number;
  /** Tamanho dos blocos sorteados, em dias seguidos. */
  block: number;
  /** Alvo como múltiplo do preço de hoje (1,25 = +25%). */
  target: number;
  /** Dias em que medir a chance de já ter tocado o alvo. */
  checkpoints: readonly number[];
  /** De quantos em quantos dias guardar as faixas do leque. */
  step: number;
  seed: number;
};

export type MonteCarloResult = {
  days: number[];
  /** Faixas do preço como múltiplo do preço de hoje, em cada dia de `days`. */
  bands: Band[];
  /** Fração das trajetórias que tocaram o alvo até cada dia de `checkpoints`. */
  hit: Record<number, number>;
};

/**
 * Bootstrap em blocos: cada trajetória emenda blocos de `block` retornos diários seguidos, sorteados
 * da amostra, o que preserva as sequências de alta e de queda do histórico. "Tocar" é algum
 * fechamento simulado chegar ao alvo, mesmo que caia depois.
 */
export function monteCarlo(input: MonteCarloInput): MonteCarloResult {
  const { returns, horizonDays, paths, block, target, checkpoints, step, seed } = input;
  const random = mulberry32(seed);
  const starts = Math.max(1, returns.length - block + 1);
  const length = Math.min(block, returns.length);

  const days: number[] = [];
  for (let d = 0; d < horizonDays; d += step) days.push(d);
  days.push(horizonDays);
  const slot = new Map(days.map((d, i) => [d, i]));
  const values = days.map(() => new Float64Array(paths));
  const firstHit = new Float64Array(paths).fill(Infinity);
  const logTarget = Math.log(target);

  for (let p = 0; p < paths; p++) {
    let level = 0;
    let start = 0;
    let offset = length;
    if (logTarget <= 0) firstHit[p] = 0;
    values[0][p] = 1;
    for (let d = 1; d <= horizonDays; d++) {
      if (offset === length) {
        start = Math.floor(random() * starts);
        offset = 0;
      }
      level += returns[start + offset++];
      if (level >= logTarget && firstHit[p] === Infinity) firstHit[p] = d;
      const s = slot.get(d);
      if (s !== undefined) values[s][p] = Math.exp(level);
    }
  }

  const at = (sorted: Float64Array, q: number) => sorted[Math.min(paths - 1, Math.floor(q * paths))];
  const bands = values.map((v) => {
    v.sort();
    return { p10: at(v, 0.1), p25: at(v, 0.25), p50: at(v, 0.5), p75: at(v, 0.75), p90: at(v, 0.9) };
  });
  const hit: Record<number, number> = {};
  for (const c of checkpoints) hit[c] = firstHit.filter((d) => d <= c).length / paths;
  return { days, bands, hit };
}
