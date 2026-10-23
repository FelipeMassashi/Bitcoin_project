import { z } from "zod";
import { parseKlines, type Candle } from "./klines";
import { buildDailySeries, type DailyPoint } from "./series";

// Endpoint só de dados públicos de mercado; não aceita chave e não depende da conta.
const BINANCE = "https://data-api.binance.vision/api/v3";
const PAGE = 1000;

export type MarketSymbol = "BTCUSDT" | "BTCBRL" | "USDTBRL";
export type KlineInterval = "15m" | "1h" | "1d";

/** Todos os candles desde `startTime`, paginando de 1.000 em 1.000. */
export async function fetchKlines(
  symbol: MarketSymbol,
  interval: KlineInterval,
  startTime = 0,
  signal?: AbortSignal,
): Promise<Candle[]> {
  const all: Candle[] = [];
  let from = startTime;
  for (;;) {
    const url = `${BINANCE}/klines?symbol=${symbol}&interval=${interval}&startTime=${from}&limit=${PAGE}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Binance respondeu ${res.status} ao buscar ${symbol}`);
    const page = parseKlines(await res.json());
    all.push(...page);
    if (page.length < PAGE) return all;
    from = page[page.length - 1].time + 1;
  }
}

const legacyFile = z.array(z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number()]));
const ptaxFile = z.array(z.tuple([z.number(), z.number()]));

async function fetchStatic<T>(path: string, schema: z.ZodType<T>, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal });
  if (!res.ok) throw new Error(`Não foi possível carregar ${path}`);
  return schema.parse(await res.json());
}

/** Série diária completa em USD e BRL, de 2011 até hoje. */
export async function fetchDailySeries(signal?: AbortSignal): Promise<DailyPoint[]> {
  const [legacy, ptax, btcUsdt, btcBrl, usdtBrl] = await Promise.all([
    fetchStatic("/data/btc-usd-legacy.json", legacyFile, signal),
    fetchStatic("/data/ptax.json", ptaxFile, signal),
    fetchKlines("BTCUSDT", "1d", 0, signal),
    fetchKlines("BTCBRL", "1d", 0, signal),
    fetchKlines("USDTBRL", "1d", 0, signal),
  ]);
  return buildDailySeries({
    legacyUsd: legacy.map(([time, open, high, low, close, volume]) => ({ time, open, high, low, close, volume })),
    ptax: ptax.map(([time, rate]) => ({ time, rate })),
    btcUsdt,
    btcBrl,
    usdtBrl,
  });
}
