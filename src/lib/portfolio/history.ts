import type { Currency } from "@/lib/format/format";
import type { DailyPoint } from "@/lib/market/series";
import { costOfSale, type Position } from "./position";

export type HistoryPoint = { time: number; invested: number; value: number };

const DAY_MS = 86_400_000;

/**
 * Total investido em posse e Patrimônio em BTC (fechamento do dia × quantidade) de cada dia,
 * do primeiro Aporte até hoje. Sem data de compra, não há como reconstruir: devolve vazio.
 */
export function portfolioHistory(position: Position, daily: readonly DailyPoint[], currency: Currency): HistoryPoint[] {
  const entries = position.entries.filter((e) => e.date !== null);
  if (entries.length === 0) return [];
  const startDay = Math.floor(entries[0].date! / DAY_MS) * DAY_MS;
  let next = 0;
  let btc = 0;
  let invested = 0;
  const out: HistoryPoint[] = [];
  for (const p of daily) {
    if (p.time < startDay) continue;
    while (next < entries.length && entries[next].date! < p.time + DAY_MS) {
      const e = entries[next++];
      if (e.kind === "aporte") {
        btc += e.btc;
        invested += e.value[currency];
      } else {
        invested -= costOfSale(invested, btc, e.btc);
        btc = Math.max(0, btc - e.btc);
      }
    }
    const close = currency === "BRL" ? p.brl.close : p.usd.close;
    out.push({ time: p.time, invested, value: btc * close });
  }
  return out;
}
