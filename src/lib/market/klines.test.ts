import { describe, expect, it } from "vitest";
import { parseKlines } from "./klines";

// Linha real de /api/v3/klines?symbol=BTCUSDT&interval=1d (17/08/2017).
const raw = [
  [
    1502928000000, "4261.48000000", "4485.39000000", "4200.74000000", "4285.08000000",
    "795.15037700", 1503014399999, "3454770.05073206", 3427, "616.24854100",
    "2678216.40060401", "0",
  ],
];

describe("parseKlines", () => {
  it("converte a resposta da Binance em candles numéricos", () => {
    expect(parseKlines(raw)).toEqual([
      { time: 1502928000000, open: 4261.48, high: 4485.39, low: 4200.74, close: 4285.08, volume: 795.150377 },
    ]);
  });

  it("recusa resposta fora do formato esperado", () => {
    expect(() => parseKlines([["x"]])).toThrow();
    expect(() => parseKlines({ code: -1121, msg: "Invalid symbol." })).toThrow();
  });
});
