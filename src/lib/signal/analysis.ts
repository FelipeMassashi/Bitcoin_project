import { MIN_WEIGHT_FRACTION, SIGNAL_WEIGHTS, type IndicatorKey } from "@/config/signal-weights";
import { sma, weeklyMovingAverage } from "@/lib/indicators/moving-averages";
import { macd, rsi, weeklyRsi } from "@/lib/indicators/oscillators";
import { drawdown, ratioTo } from "@/lib/indicators/valuation";
import type { Candle } from "@/lib/market/klines";
import { compositeScore, type ScorePoint } from "./composite";
import { expandingPercentile } from "./percentile";

// Um ano de histórico antes de dar nota por percentil: menos que isso não diz o que é "caro".
const MIN_HISTORY = 365;

type Series = (number | null)[];

/** Indicadores que já vêm de 0 a 100 e entram direto como Nota, sem percentil. */
export const DIRECT_NOTES: ReadonlySet<IndicatorKey> = new Set(["fearGreed", "rsiDaily", "rsiWeekly"]);

export type Analysis = {
  /** Valores brutos de cada indicador, dia a dia. */
  values: Record<IndicatorKey, Series>;
  /** Nota de 0 (barato) a 100 (caro) de cada indicador. */
  notes: Record<IndicatorKey, Series>;
  score: (ScorePoint<IndicatorKey> | null)[];
};

/** Todos os indicadores e o Sinal composto sobre a série diária em USD. */
export function analyze(candles: readonly Candle[], fearGreed: ReadonlyMap<number, number>): Analysis {
  const closes = candles.map((c) => c.close);
  const ma200w = weeklyMovingAverage(candles, 200);
  const values: Record<IndicatorKey, Series> = {
    mayer: ratioTo(closes, sma(closes, 200)),
    ma200w: ratioTo(closes, ma200w).map((r) => (r === null ? null : r - 1)),
    drawdown: drawdown(candles),
    fearGreed: candles.map((c) => fearGreed.get(c.time) ?? null),
    rsiDaily: rsi(closes, 14),
    rsiWeekly: weeklyRsi(candles, 14),
    // Histograma do MACD em proporção do preço, para comparar 2013 com hoje.
    macd: macd(closes).map((m, i) => (m?.histogram == null ? null : m.histogram / closes[i])),
  };
  const notes = Object.fromEntries(
    (Object.keys(values) as IndicatorKey[]).map((k) => [k, DIRECT_NOTES.has(k) ? values[k] : expandingPercentile(values[k], MIN_HISTORY)]),
  ) as Record<IndicatorKey, Series>;
  return { values, notes, score: compositeScore(notes, SIGNAL_WEIGHTS, MIN_WEIGHT_FRACTION) };
}
