import { describe, expect, it } from "vitest";
import { ema, macd, rsi, weeklyRsi } from "./oscillators";

// Série do exemplo de Wilder publicado pela StockCharts. Valores esperados calculados à mão:
// nas 14 primeiras variações as altas somam 3,34 e as quedas 1,40 → médias 0,23857 e 0,1 → RSI 70,46.
// (A planilha da StockCharts mostra 70,53 porque arredonda as médias antes de dividir.)
// Dia seguinte, queda de 0,28: médias 0,22153 e 0,11286 → RSI 66,25.
const WILDER = [
  44.34, 44.09, 44.15, 43.61, 44.33, 44.83, 45.1, 45.42, 45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.0,
  46.03, 46.41, 46.22, 45.64,
];

describe("rsi", () => {
  it("segue a suavização de Wilder", () => {
    const out = rsi(WILDER, 14);
    expect(out.slice(0, 14).every((v) => v === null)).toBe(true);
    expect(out[14]).toBeCloseTo(70.46, 2);
    expect(out[15]).toBeCloseTo(66.25, 2);
  });

  it("só altas dá 100", () => {
    expect(rsi([1, 2, 3, 4], 3).at(-1)).toBe(100);
  });
});

describe("ema", () => {
  it("começa pela média simples do primeiro período e depois pondera 2/(n+1)", () => {
    expect(ema([2, 4, 6, 8, 10], 3)).toEqual([null, null, 4, 6, 8]);
  });
});

describe("macd", () => {
  // Numa reta x = i, a média exponencial de n períodos fica sempre (n − 1)/2 atrás:
  // EMA12 = x − 5,5 e EMA26 = x − 12,5, então MACD = 7 e o histograma é zero.
  it("numa tendência linear o MACD é constante e o histograma zera", () => {
    const line = Array.from({ length: 60 }, (_, i) => i);
    const out = macd(line);
    expect(out[24]).toBeNull();
    expect(out[25]?.macd).toBeCloseTo(7, 9);
    expect(out[32]?.signal).toBeNull();
    expect(out[33]?.signal).toBeCloseTo(7, 9);
    expect(out[59]?.histogram).toBeCloseTo(0, 9);
  });
});

describe("weeklyRsi", () => {
  const day = (iso: string, close: number) => ({ time: Date.parse(`${iso}T00:00:00Z`), close });
  // Semanas (seg a dom) fechando em 10, 12, 11; a quarta semana está em andamento.
  const candles = [
    day("2024-01-07", 10),
    day("2024-01-14", 12),
    day("2024-01-21", 11),
    day("2024-01-24", 14),
  ];

  it("usa fechamentos semanais e o preço do dia como fechamento provisório da semana", () => {
    // RSI(2) sobre 10, 12, 11: médias 1 e 0,5 → 66,67. Provisório 14 (+3): médias 2 e 0,25 → 88,89.
    const out = weeklyRsi(candles, 2);
    expect(out[0]).toBeNull();
    expect(out[1]).toBeNull();
    expect(out[2]).toBeCloseTo(66.67, 2);
    expect(out[3]).toBeCloseTo(88.89, 2);
  });
});
