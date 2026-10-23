import type { Candle } from "@/lib/market/klines";

export type MonthStats = {
  year: number;
  /** 1 a 12. */
  month: number;
  open: number;
  high: number;
  low: number;
  close: number;
  highTime: number;
  lowTime: number;
  /** Fechamento ÷ fechamento do mês anterior − 1 (no primeiro mês, ÷ abertura). */
  change: number;
  /** Pico ÷ mínima − 1. */
  range: number;
};

/** Agrupa candles diários por mês do calendário (UTC), na ordem cronológica. */
export function monthlyStats(candles: readonly Candle[]): MonthStats[] {
  const months: MonthStats[] = [];
  for (const k of candles) {
    const date = new Date(k.time);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const current = months.at(-1);
    if (current && current.year === year && current.month === month) {
      if (k.high > current.high) Object.assign(current, { high: k.high, highTime: k.time });
      if (k.low < current.low) Object.assign(current, { low: k.low, lowTime: k.time });
      current.close = k.close;
    } else {
      months.push({
        year, month, open: k.open, high: k.high, low: k.low, close: k.close,
        highTime: k.time, lowTime: k.time, change: 0, range: 0,
      });
    }
  }
  months.forEach((m, i) => {
    m.change = m.close / (i === 0 ? m.open : months[i - 1].close) - 1;
    m.range = m.high / m.low - 1;
  });
  return months;
}
