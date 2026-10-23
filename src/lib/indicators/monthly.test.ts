import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/market/klines";
import { monthlyStats } from "./monthly";

const c = (iso: string, open: number, high: number, low: number, close: number): Candle => ({
  time: Date.parse(`${iso}T00:00:00Z`), open, high, low, close, volume: 1,
});

describe("monthlyStats", () => {
  const candles = [
    c("2024-01-01", 100, 110, 95, 105),
    c("2024-01-31", 105, 130, 100, 120),
    c("2024-02-01", 120, 125, 90, 96),
    c("2024-02-15", 96, 99, 80, 90),
  ];

  it("agrega abertura, pico, mínima e fechamento de cada mês", () => {
    const [jan, feb] = monthlyStats(candles);
    expect(jan).toMatchObject({ year: 2024, month: 1, open: 100, high: 130, low: 95, close: 120 });
    expect(feb).toMatchObject({ year: 2024, month: 2, open: 120, high: 125, low: 80, close: 90 });
  });

  it("variação é fechamento ÷ fechamento do mês anterior (ou ÷ abertura no primeiro mês) e amplitude é pico ÷ mínima", () => {
    const [jan, feb] = monthlyStats(candles);
    expect(jan.change).toBeCloseTo(0.2, 10);
    expect(feb.change).toBeCloseTo(-0.25, 10);
    expect(jan.range).toBeCloseTo(130 / 95 - 1, 10);
  });

  it("guarda o dia do pico e da mínima", () => {
    const [, feb] = monthlyStats(candles);
    expect(feb.highTime).toBe(Date.parse("2024-02-01T00:00:00Z"));
    expect(feb.lowTime).toBe(Date.parse("2024-02-15T00:00:00Z"));
  });

  it("sem candles não há meses", () => {
    expect(monthlyStats([])).toEqual([]);
  });
});
