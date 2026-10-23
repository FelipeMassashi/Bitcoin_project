import type { Currency } from "@/lib/format/format";
import type { Candle } from "./klines";
import type { DailyPoint } from "./series";

/** Par da Binance que dá o preço do BTC em cada moeda. */
export const BTC_SYMBOL = { BRL: "BTCBRL", USD: "BTCUSDT" } as const satisfies Record<Currency, string>;

export function candleIn(point: DailyPoint, currency: Currency): Candle {
  return currency === "BRL" ? point.brl : point.usd;
}
