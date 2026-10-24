import type { Currency } from "@/lib/format/format";
import type { DailyPoint } from "@/lib/market/series";

const DAY_MS = 86_400_000;

export type Frequency = "semanal" | "mensal";
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

/** Dias de compra entre `start` e `end` (ou o último dia da série), dentro da série. */
function schedule(daily: readonly DailyPoint[], start: number, end: number | undefined, frequency: Frequency): number[] {
  const first = daily[0].time;
  const last = Math.min(daily[daily.length - 1].time, end ?? Infinity);
  const startDay = Math.max(Math.floor(start / DAY_MS) * DAY_MS, first);
  const dates: number[] = [];
  for (let i = 0, t = startDay; t <= last; i++, t = frequency === "mensal" ? addMonths(startDay, i) : startDay + i * 7 * DAY_MS) {
    dates.push(t);
  }
  return dates;
}

const closeAt = (daily: readonly DailyPoint[], time: number, currency: Currency) => {
  const point = daily[Math.round((time - daily[0].time) / DAY_MS)];
  return currency === "BRL" ? point.brl.close : point.usd.close;
};

function buy(daily: readonly DailyPoint[], dates: number[], amount: number, currency: Currency): DcaResult {
  const buys = dates.map((time) => {
    const price = closeAt(daily, time, currency);
    return { time, amount, price, btc: amount / price };
  });
  const btc = buys.reduce((sum, b) => sum + b.btc, 0);
  return { buys, btc, averagePrice: (amount * buys.length) / btc };
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
  const dates = schedule(daily, start, undefined, "mensal");
  return dates.length ? buy(daily, dates, total / dates.length, currency) : null;
}

export type DcaSimulation = DcaResult & {
  invested: number;
  /** Total investido e valor acumulado (quantidade × fechamento) de cada dia, do início ao fim. */
  history: { time: number; invested: number; value: number }[];
};

/** Simulador de DCA: `amount` a cada semana ou mês, pelo preço de fechamento, de `start` até `end` (ou hoje). */
export function simulateDca(
  daily: readonly DailyPoint[],
  { amount, frequency, start, end, currency }: { amount: number; frequency: Frequency; start: number; end?: number; currency: Currency },
): DcaSimulation | null {
  const dates = schedule(daily, start, end, frequency);
  if (dates.length === 0) return null;
  const result = buy(daily, dates, amount, currency);
  const history: DcaSimulation["history"] = [];
  let next = 0;
  let btc = 0;
  let invested = 0;
  const last = Math.min(daily[daily.length - 1].time, end ?? Infinity);
  for (let t = dates[0]; t <= last; t += DAY_MS) {
    while (next < result.buys.length && result.buys[next].time <= t) {
      btc += result.buys[next].btc;
      invested += amount;
      next++;
    }
    history.push({ time: t, invested, value: btc * closeAt(daily, t, currency) });
  }
  return { ...result, invested: amount * dates.length, history };
}
