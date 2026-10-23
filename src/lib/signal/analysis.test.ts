import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/market/klines";
import { analyze } from "./analysis";

const DAY = 86_400_000;

function walk(days: number, seed: number): Candle[] {
  let x = seed;
  let price = 1000;
  return Array.from({ length: days }, (_, i) => {
    x = (x * 16807) % 2147483647; // gerador determinístico
    price *= 1 + ((x / 2147483647) - 0.49) * 0.06;
    return { time: Date.UTC(2015, 0, 1) + i * DAY, open: price, high: price * 1.01, low: price * 0.99, close: price, volume: 1 };
  });
}

describe("analyze", () => {
  it("o sinal de cada dia não muda quando o futuro muda (sem look-ahead)", () => {
    const base = walk(2000, 7);
    const changedFuture = base.map((c, i) => (i >= 1700 ? { ...c, close: c.close * 3, high: c.high * 3 } : c));
    const a = analyze(base, new Map());
    const b = analyze(changedFuture, new Map());
    expect(b.score.slice(0, 1700)).toEqual(a.score.slice(0, 1700));
    expect(a.score.at(-1)).not.toBeNull();
  });

  it("Fear & Greed entra direto como nota no dia correspondente", () => {
    const candles = walk(1500, 3);
    const fng = new Map([[candles[1499].time, 12]]);
    expect(analyze(candles, fng).notes.fearGreed[1499]).toBe(12);
  });
});
