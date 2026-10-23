/** Média móvel simples alinhada à entrada: posição i é a média de values[i-period+1..i]. */
export function sma(values: readonly number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

export type BollingerPoint = { middle: number; upper: number; lower: number };

/** Bandas de Bollinger com desvio-padrão populacional (a convenção dos gráficos de mercado). */
export function bollinger(values: readonly number[], period = 20, k = 2): (BollingerPoint | null)[] {
  const middle = sma(values, period);
  return middle.map((mean, i) => {
    if (mean === null) return null;
    let squares = 0;
    for (let j = i - period + 1; j <= i; j++) squares += (values[j] - mean) ** 2;
    const sd = Math.sqrt(squares / period);
    return { middle: mean, upper: mean + k * sd, lower: mean - k * sd };
  });
}

const DAY_MS = 86_400_000;

/** Início (segunda 00:00 UTC) da semana que contém `time`. */
export function weekStart(time: number): number {
  const daysSinceMonday = (new Date(time).getUTCDay() + 6) % 7;
  return Math.floor(time / DAY_MS) * DAY_MS - daysSinceMonday * DAY_MS;
}

/**
 * Média móvel de `weeks` semanas para cada candle diário: fechamentos das semanas já
 * encerradas mais o preço do dia como fechamento provisório da semana corrente.
 */
export function weeklyMovingAverage(
  candles: readonly { time: number; close: number }[],
  weeks: number,
): (number | null)[] {
  const closedWeeks: number[] = [];
  let closedSum = 0;
  let currentWeek: number | null = null;
  let currentClose = 0;

  return candles.map(({ time, close }) => {
    const week = weekStart(time);
    if (currentWeek !== null && week !== currentWeek) {
      closedWeeks.push(currentClose);
      closedSum += currentClose;
      if (closedWeeks.length > weeks - 1) closedSum -= closedWeeks[closedWeeks.length - weeks];
    }
    currentWeek = week;
    currentClose = close;
    if (closedWeeks.length < weeks - 1) return null;
    return (closedSum + close) / weeks;
  });
}
