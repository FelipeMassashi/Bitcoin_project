import { weekStart } from "./moving-averages";

/** Estado da média suavizada de Wilder: altas e quedas médias. */
type WilderState = { gain: number; loss: number };

function rsiFrom({ gain, loss }: WilderState): number {
  if (loss === 0) return gain === 0 ? 50 : 100;
  return 100 - 100 / (1 + gain / loss);
}

function step(state: WilderState, change: number, period: number): WilderState {
  return {
    gain: (state.gain * (period - 1) + Math.max(change, 0)) / period,
    loss: (state.loss * (period - 1) + Math.max(-change, 0)) / period,
  };
}

/** RSI de Wilder: média simples das primeiras `period` variações, depois suavização de Wilder. */
export function rsi(values: readonly number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let state = initialState(values, period);
  out[period] = rsiFrom(state);
  for (let i = period + 1; i < values.length; i++) {
    state = step(state, values[i] - values[i - 1], period);
    out[i] = rsiFrom(state);
  }
  return out;
}

function initialState(closes: readonly number[], period: number): WilderState {
  const state = { gain: 0, loss: 0 };
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    state.gain += Math.max(change, 0) / period;
    state.loss += Math.max(-change, 0) / period;
  }
  return state;
}

/**
 * RSI semanal para cada candle diário: fechamentos das semanas já encerradas (segunda a domingo, UTC)
 * mais o preço do dia como fechamento provisório da semana corrente.
 */
export function weeklyRsi(candles: readonly { time: number; close: number }[], period = 14): (number | null)[] {
  const closed: number[] = [];
  let state: WilderState | null = null;
  let currentWeek: number | null = null;
  let currentClose = 0;

  return candles.map(({ time, close }) => {
    const week = weekStart(time);
    if (currentWeek !== null && week !== currentWeek) {
      closed.push(currentClose);
      if (closed.length === period + 1) state = initialState(closed, period);
      else if (state) state = step(state, closed[closed.length - 1] - closed[closed.length - 2], period);
    }
    currentWeek = week;
    currentClose = close;
    if (state) return rsiFrom(step(state, close - closed[closed.length - 1], period));
    if (closed.length === period) return rsiFrom(initialState([...closed, close], period));
    return null;
  });
}

/** Média móvel exponencial, semeada com a média simples dos primeiros `period` valores. */
export function ema(values: readonly number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length < period) return out;
  const k = 2 / (period + 1);
  let current = 0;
  for (let i = 0; i < period; i++) current += values[i] / period;
  out[period - 1] = current;
  for (let i = period; i < values.length; i++) {
    current = values[i] * k + current * (1 - k);
    out[i] = current;
  }
  return out;
}

export type MacdPoint = { macd: number; signal: number | null; histogram: number | null };

/** MACD clássico: EMA rápida − EMA lenta, linha de sinal = EMA da diferença. */
export function macd(values: readonly number[], fast = 12, slow = 26, signalPeriod = 9): (MacdPoint | null)[] {
  const fastEma = ema(values, fast);
  const slowEma = ema(values, slow);
  const start = slow - 1;
  const line = values.slice(start).map((_, j) => fastEma[start + j]! - slowEma[start + j]!);
  const signal = ema(line, signalPeriod);
  return values.map((_, i) => {
    if (i < start) return null;
    const m = line[i - start];
    const s = signal[i - start];
    return { macd: m, signal: s, histogram: s === null ? null : m - s };
  });
}
