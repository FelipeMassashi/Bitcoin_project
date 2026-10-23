import { describe, expect, it } from "vitest";
import { backtestZones } from "./backtest";

describe("backtestZones", () => {
  const closes = [100, 110, 90, 120, 80, 100];
  //               compra neutro venda compra —  compra
  const scores = [10, 50, 90, 20, null, 30];

  it("mede o retorno N dias depois de cada dia em cada zona", () => {
    const result = backtestZones(closes, scores, [2]);
    expect(result.compra[2]).toEqual({ count: 2, median: (-0.1 + 100 / 120 - 1) / 2, worst: 100 / 120 - 1, positiveShare: 0 });
    expect(result.neutro[2]?.median).toBeCloseTo(120 / 110 - 1, 10);
    expect(result.venda[2]?.worst).toBeCloseTo(80 / 90 - 1, 10);
  });

  it("dias sem futuro suficiente ficam de fora", () => {
    const result = backtestZones(closes, scores, [10]);
    expect(result.compra[10]).toBeNull();
  });
});
