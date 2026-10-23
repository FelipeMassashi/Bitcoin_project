import { describe, expect, it } from "vitest";
import { compositeScore, zoneOf } from "./composite";

describe("compositeScore", () => {
  const weights = { a: 60, b: 40 };

  it("é a média ponderada das notas, e cada contribuição soma no total", () => {
    const [day] = compositeScore({ a: [20], b: [70] }, weights, 0.5);
    expect(day?.score).toBeCloseTo(40, 10); // 20·0,6 + 70·0,4
    expect(day?.contributions).toEqual({ a: 12, b: 28 });
  });

  it("sem uma nota redistribui o peso entre as disponíveis", () => {
    const [day] = compositeScore({ a: [20], b: [null] }, weights, 0.5);
    expect(day?.score).toBe(20);
    expect(day?.contributions).toEqual({ a: 20 });
  });

  it("não calcula quando os pesos disponíveis ficam abaixo do mínimo", () => {
    expect(compositeScore({ a: [null], b: [70] }, weights, 0.5)).toEqual([null]);
  });
});

describe("zoneOf", () => {
  it("compra abaixo de 35, venda acima de 65, neutro entre os dois (inclusive)", () => {
    expect(zoneOf(34.9)).toBe("compra");
    expect(zoneOf(35)).toBe("neutro");
    expect(zoneOf(65)).toBe("neutro");
    expect(zoneOf(65.1)).toBe("venda");
  });
});
