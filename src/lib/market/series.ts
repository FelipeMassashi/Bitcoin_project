import type { Candle } from "./klines";

export type FxPoint = { time: number; rate: number };

export type SeriesSources = {
  /** BTC/USD diário anterior à Binance (Bitstamp, desde 2011). */
  legacyUsd: readonly Candle[];
  btcUsdt: readonly Candle[];
  btcBrl: readonly Candle[];
  usdtBrl: readonly Candle[];
  /** Cotação de venda PTAX do Banco Central, só dias úteis. */
  ptax: readonly FxPoint[];
};

export type DailyPoint = {
  time: number;
  usd: Candle;
  brl: Candle;
  /** Quantos reais valia um dólar neste dia. */
  usdBrl: number;
};

const DAY_MS = 86_400_000;

/** Repete o fechamento anterior nos dias sem candle (a Bitstamp tem buracos). */
function fillGaps(candles: readonly Candle[]): Candle[] {
  const out: Candle[] = [];
  for (const candle of candles) {
    const prev = out.at(-1);
    if (prev) {
      for (let time = prev.time + DAY_MS; time < candle.time; time += DAY_MS) {
        const c = prev.close;
        out.push({ time, open: c, high: c, low: c, close: c, volume: 0 });
      }
    }
    out.push(candle);
  }
  return out;
}

function scale(candle: Candle, rate: number): Candle {
  return {
    ...candle,
    open: candle.open * rate,
    high: candle.high * rate,
    low: candle.low * rate,
    close: candle.close * rate,
  };
}

/**
 * Série diária única: Bitstamp até a Binance começar, depois BTCUSDT.
 * Em reais usa o par BTCBRL quando existe; antes disso converte pelo câmbio do dia
 * (USDT/BRL da Binance, repetindo o último conhecido em dias sem candle, ou a PTAX antes dele existir).
 */
export function buildDailySeries(sources: SeriesSources): DailyPoint[] {
  const binanceStart = sources.btcUsdt[0]?.time ?? Infinity;
  const usd = fillGaps([...sources.legacyUsd.filter((c) => c.time < binanceStart), ...sources.btcUsdt]);
  const btcBrl = new Map(sources.btcBrl.map((c) => [c.time, c]));
  const usdtBrl = new Map(sources.usdtBrl.map((c) => [c.time, c.close]));

  let ptaxIndex = 0;
  let lastUsdtBrl: number | undefined;
  return usd.map((candle) => {
    while (ptaxIndex + 1 < sources.ptax.length && sources.ptax[ptaxIndex + 1].time <= candle.time) ptaxIndex++;
    lastUsdtBrl = usdtBrl.get(candle.time) ?? lastUsdtBrl;
    const usdBrl = lastUsdtBrl ?? sources.ptax[ptaxIndex]?.rate ?? NaN;
    const brl = btcBrl.get(candle.time) ?? scale(candle, usdBrl);
    return { time: candle.time, usd: candle, brl, usdBrl };
  });
}
