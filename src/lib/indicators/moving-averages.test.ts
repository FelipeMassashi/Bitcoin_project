import { describe, expect, it } from "vitest";
import { bollinger, sma, weeklyMovingAverage } from "./moving-averages";

describe("sma", () => {
  it("média dos últimos N valores, nula enquanto não há N valores", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
  });

  it("série menor que o período fica toda nula", () => {
    expect(sma([10, 20], 200)).toEqual([null, null]);
  });
});

describe("bollinger", () => {
  it("banda central é a média de 20 e as bandas ficam a 2 desvios-padrão populacionais", () => {
    const values = Array.from({ length: 20 }, (_, i) => i + 1); // 1..20
    const last = bollinger(values, 20, 2).at(-1);
    // média 10,5; desvio populacional de 1..20 = √33,25 ≈ 5,76628
    expect(last?.middle).toBeCloseTo(10.5, 6);
    expect(last?.upper).toBeCloseTo(22.03256, 4);
    expect(last?.lower).toBeCloseTo(-1.03256, 4);
    expect(bollinger(values, 20, 2)[18]).toBeNull();
  });
});

describe("weeklyMovingAverage", () => {
  const day = (iso: string, close: number) => ({ time: Date.parse(`${iso}T00:00:00Z`), close });
  // 01/01/2024 é segunda-feira; a semana da Binance começa na segunda 00:00 UTC.
  const candles = [
    day("2024-01-01", 10),
    day("2024-01-03", 20),
    day("2024-01-08", 30),
    day("2024-01-10", 40),
    day("2024-01-15", 50),
  ];

  it("usa o fechamento das semanas anteriores e o preço do dia como semana corrente", () => {
    expect(weeklyMovingAverage(candles, 2)).toEqual([null, null, 25, 30, 45]);
  });
});
