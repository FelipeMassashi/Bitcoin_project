import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/market/klines";
import type { DailyPoint } from "@/lib/market/series";
import { monthlyDca, simulateDca } from "./dca";

const DAY = 86_400_000;
const candle = (time: number, close: number): Candle => ({ time, open: close, high: close, low: close, close, volume: 0 });

/** Série diária de 1º/jan a 20/abr/2024 com o preço constante em cada mês. */
function series(prices: Record<number, number>): DailyPoint[] {
  const out: DailyPoint[] = [];
  for (let t = Date.UTC(2024, 0, 1); t <= Date.UTC(2024, 3, 20); t += DAY) {
    const usd = prices[new Date(t).getUTCMonth()];
    out.push({ time: t, usd: candle(t, usd), brl: candle(t, usd * 5), usdBrl: 5 });
  }
  return out;
}

describe("monthlyDca", () => {
  const daily = series({ 0: 100, 1: 200, 2: 50, 3: 100 });

  it("divide o valor em compras mensais iguais no mesmo dia do mês", () => {
    const r = monthlyDca(daily, { start: Date.UTC(2024, 0, 15), total: 400, currency: "USD" });
    expect(r!.buys.map((b) => new Date(b.time).toISOString().slice(0, 10))).toEqual([
      "2024-01-15",
      "2024-02-15",
      "2024-03-15",
      "2024-04-15",
    ]);
    // 100/100 + 100/200 + 100/50 + 100/100
    expect(r!.btc).toBeCloseTo(4.5, 12);
    expect(r!.averagePrice).toBeCloseTo(400 / 4.5, 9);
  });

  it("compra no último dia dos meses mais curtos", () => {
    const r = monthlyDca(daily, { start: Date.UTC(2024, 0, 31), total: 300, currency: "BRL" });
    expect(r!.buys.map((b) => new Date(b.time).toISOString().slice(0, 10))).toEqual([
      "2024-01-31",
      "2024-02-29",
      "2024-03-31",
    ]);
    // R$ 100 a R$ 500, R$ 1.000 e R$ 250
    expect(r!.btc).toBeCloseTo(0.2 + 0.1 + 0.4, 12);
  });

  it("começando hoje, faz uma compra só", () => {
    const r = monthlyDca(daily, { start: Date.UTC(2024, 3, 20), total: 100, currency: "USD" });
    expect(r!.buys).toHaveLength(1);
    expect(r!.btc).toBeCloseTo(1, 12);
  });

  it("começando depois do último dia da série, não há simulação", () => {
    expect(monthlyDca(daily, { start: Date.UTC(2024, 4, 1), total: 100, currency: "USD" })).toBeNull();
  });
});

describe("simulateDca", () => {
  const daily = series({ 0: 100, 1: 200, 2: 50, 3: 100 });

  it("compra o mesmo valor toda semana a partir da data de início", () => {
    const r = simulateDca(daily, { amount: 100, frequency: "semanal", start: Date.UTC(2024, 0, 1), end: Date.UTC(2024, 0, 31), currency: "USD" })!;
    expect(r.buys.map((b) => new Date(b.time).getUTCDate())).toEqual([1, 8, 15, 22, 29]);
    expect(r.invested).toBe(500);
    expect(r.btc).toBeCloseTo(5, 12);
  });

  it("compra todo mês e para na data final", () => {
    const r = simulateDca(daily, { amount: 100, frequency: "mensal", start: Date.UTC(2024, 0, 15), end: Date.UTC(2024, 2, 1), currency: "USD" })!;
    expect(r.buys).toHaveLength(2);
    expect(r.invested).toBe(200);
    // 100/100 + 100/200
    expect(r.btc).toBeCloseTo(1.5, 12);
    expect(r.averagePrice).toBeCloseTo(200 / 1.5, 9);
  });

  it("o histórico mostra o valor acumulado e o total investido dia a dia até o fim", () => {
    const r = simulateDca(daily, { amount: 100, frequency: "mensal", start: Date.UTC(2024, 0, 15), end: Date.UTC(2024, 2, 1), currency: "USD" })!;
    const at = (y: number, m: number, d: number) => r.history.find((p) => p.time === Date.UTC(y, m, d))!;
    expect(at(2024, 0, 15)).toEqual({ time: Date.UTC(2024, 0, 15), invested: 100, value: 100 });
    expect(at(2024, 1, 15)).toEqual({ time: Date.UTC(2024, 1, 15), invested: 200, value: 300 });
    expect(r.history.at(-1)!.time).toBe(Date.UTC(2024, 2, 1));
  });

  it("sem nenhuma compra no período, não há simulação", () => {
    expect(simulateDca(daily, { amount: 100, frequency: "mensal", start: Date.UTC(2025, 0, 1), currency: "USD" })).toBeNull();
  });
});
