import { z } from "zod";
import type { MarketSymbol } from "./client";

const decimal = z.string().transform(Number);

/** Mensagem do stream combinado `<symbol>@ticker` (estatística móvel de 24 h). */
const tickerMessage = z.object({
  stream: z.string(),
  data: z.object({
    s: z.string(),
    c: decimal, // último preço
    P: decimal, // variação % em 24 h
    E: z.number(), // hora do evento
  }),
});

export type Ticker = {
  symbol: MarketSymbol;
  last: number;
  /** Variação em 24 h como fração (0,0123 = +1,23%). */
  change24h: number;
  time: number;
};

export function parseTickerMessage(json: unknown): Ticker | null {
  const parsed = tickerMessage.safeParse(json);
  if (!parsed.success) return null;
  const { s, c, P, E } = parsed.data.data;
  if (s !== "BTCUSDT" && s !== "BTCBRL" && s !== "USDTBRL") return null;
  return { symbol: s, last: c, change24h: P / 100, time: E };
}
