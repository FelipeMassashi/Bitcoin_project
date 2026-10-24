import type { Currency } from "@/lib/format/format";
import type { DailyPoint } from "@/lib/market/series";

const DAY_MS = 86_400_000;

export type DcaBuy = { time: number; amount: number; price: number; btc: number };
export type DcaResult = { buys: DcaBuy[]; btc: number; averagePrice: number };

/** Mesmo dia do mês `months` meses depois de `start`, ou o último dia de um mês mais curto. */
function addMonths(start: number, months: number): number {
  const d = new Date(start);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(d.getUTCDate(), lastDay));
}

/**
 * "E se o mesmo dinheiro tivesse sido dividido em compras mensais iguais?"
 * Compra pelo fechamento no dia `start` e no mesmo dia de cada mês seguinte até o último dia da série.
 * Sem nenhum dia de compra dentro da série, devolve null.
 */
export function monthlyDca(
  daily: readonly DailyPoint[],
  { start, total, currency }: { start: number; total: number; currency: Currency },
): DcaResult | null {
  const first = daily[0].time;
  const last = daily[daily.length - 1].time;
  const dates: number[] = [];
  const startDay = Math.max(Math.floor(start / DAY_MS) * DAY_MS, first);
  for (let i = 0, t = startDay; t <= last; t = addMonths(startDay, ++i)) dates.push(t);
  if (dates.length === 0) return null;

  const amount = total / dates.length;
  const buys = dates.map((time) => {
    const point = daily[Math.round((time - first) / DAY_MS)];
    const price = currency === "BRL" ? point.brl.close : point.usd.close;
    return { time, amount, price, btc: amount / price };
  });
  const btc = buys.reduce((sum, b) => sum + b.btc, 0);
  return { buys, btc, averagePrice: total / btc };
}
