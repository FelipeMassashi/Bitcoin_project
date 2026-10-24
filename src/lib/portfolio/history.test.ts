import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/market/klines";
import type { DailyPoint } from "@/lib/market/series";
import { portfolioHistory } from "./history";
import { computePosition } from "./position";

const DAY = 86_400_000;
const T0 = Date.UTC(2024, 0, 1);
const day = (n: number) => T0 + n * DAY;
const candle = (time: number, close: number): Candle => ({ time, open: close, high: close, low: close, close, volume: 0 });
const point = (n: number, usd: number): DailyPoint => ({ time: day(n), usd: candle(day(n), usd), brl: candle(day(n), usd * 5), usdBrl: 5 });
const daily = [point(0, 100), point(1, 200), point(2, 150), point(3, 300)];

describe("portfolioHistory", () => {
  it("acompanha quantidade, Total investido e Patrimônio em BTC dia a dia desde o primeiro aporte", () => {
    const position = computePosition(
      {
        kind: "aportes",
        aportes: [
          { id: "a", date: day(1), amount: 200, currency: "USD", btc: 1 },
          { id: "b", date: day(2), amount: 150, currency: "USD", btc: 1 },
        ],
        vendas: [{ id: "v", date: day(3), btc: 1, amount: 300, currency: "USD" }],
      },
      daily,
    );
    expect(portfolioHistory(position, daily, "USD")).toEqual([
      { time: day(1), invested: 200, value: 200 },
      { time: day(2), invested: 350, value: 300 },
      // vende 1 de 2 BTC: sai metade do custo (175)
      { time: day(3), invested: 175, value: 300 },
    ]);
  });

  it("sem data de compra não há histórico", () => {
    const position = computePosition({ kind: "total", amount: 100, currency: "USD" }, daily, 1);
    expect(portfolioHistory(position, daily, "USD")).toEqual([]);
  });
});
