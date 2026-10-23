import { describe, expect, it } from "vitest";
import { cycleComparison, drawdown, ratioTo } from "./valuation";

describe("ratioTo", () => {
  it("divide o preço pela referência e fica nulo onde ela não existe (Mayer Multiple = preço ÷ média de 200 dias)", () => {
    expect(ratioTo([100, 150, 90], [null, 100, 120])).toEqual([null, 1.5, 0.75]);
  });
});

describe("drawdown", () => {
  it("mede a queda em relação à maior máxima já vista até aquele dia", () => {
    const candles = [
      { high: 100, close: 100 },
      { high: 120, close: 110 },
      { high: 115, close: 90 },
      { high: 130, close: 130 },
    ];
    expect(drawdown(candles)).toEqual([0, 110 / 120 - 1, 90 / 120 - 1, 0]);
  });
});

describe("cycleComparison", () => {
  const DAY = 86_400_000;
  const start = Date.UTC(2020, 0, 1);
  // 10 dias de preço; halvings fictícios nos dias 0 e 5; "hoje" é o dia 7 (2 dias no ciclo 2).
  const closes = [100, 150, 300, 200, 180, 50, 60, 70, 80, 90];
  const candles = closes.map((close, i) => ({ time: start + i * DAY, high: close, close }));
  const halvings = [start, start + 5 * DAY];

  it("compara o ciclo atual com os anteriores no mesmo número de dias desde o halving", () => {
    const [first, current] = cycleComparison(candles.slice(0, 8), halvings);
    expect(first).toEqual({
      cycle: 1, halving: start, halvingPrice: 100,
      topDays: 2, topMultiple: 3,
      sameDayMultiple: 3, // dia 2 do ciclo 1: 300 ÷ 100
    });
    expect(current).toEqual({
      cycle: 2, halving: start + 5 * DAY, halvingPrice: 50,
      topDays: 2, topMultiple: 70 / 50,
      sameDayMultiple: 70 / 50,
    });
  });

  it("o topo do ciclo é a maior máxima dos dois primeiros anos, não um recorde no fim do ciclo", () => {
    // Ciclo de 800 dias: pico em 400 no dia 400, fundo de 50 no dia 600, novo recorde 500 no dia 790.
    const long = Array.from({ length: 800 }, (_, i) => {
      const close = i === 400 ? 400 : i === 600 ? 50 : i === 790 ? 500 : 100;
      return { time: start + i * DAY, high: close, close };
    });
    const [cycle] = cycleComparison(long, [start]);
    expect(cycle.topDays).toBe(400);
    expect(cycle.topMultiple).toBe(4);
  });
});

