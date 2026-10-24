import { describe, expect, it } from "vitest";
import type { Candle } from "@/lib/market/klines";
import type { DailyPoint } from "@/lib/market/series";
import { computePosition, valuation } from "./position";

const DAY = 86_400_000;
const T0 = Date.UTC(2024, 0, 1);
const day = (n: number) => T0 + n * DAY;
const candle = (time: number, close: number): Candle => ({ time, open: close, high: close, low: close, close, volume: 0 });
/** Um dia com o BTC a `usd` dólares e o dólar a `usdBrl` reais. */
const point = (n: number, usd: number, usdBrl: number): DailyPoint => ({
  time: day(n),
  usd: candle(day(n), usd),
  brl: candle(day(n), usd * usdBrl),
  usdBrl,
});
// Dia 0: BTC a US$ 10.000 com dólar a R$ 5. Dia 1: US$ 20.000 com dólar a R$ 6. Dia 2 (hoje): US$ 30.000, R$ 5,50.
const daily = [point(0, 10_000, 5), point(1, 20_000, 6), point(2, 30_000, 5.5)];

describe("computePosition", () => {
  it("sem aportes não há posição", () => {
    const p = computePosition({ kind: "aportes", aportes: [], vendas: [] }, daily);
    expect(p.btc).toBe(0);
    expect(p.invested).toEqual({ BRL: 0, USD: 0 });
    expect(p.averagePrice).toBeNull();
    expect(p.realized).toEqual({ BRL: 0, USD: 0 });
  });

  it("aporte único em reais registra o custo nas duas moedas pela cotação do dia", () => {
    const p = computePosition(
      { kind: "aportes", aportes: [{ id: "a", date: day(0), amount: 5_000, currency: "BRL", btc: 0.1 }], vendas: [] },
      daily,
    );
    expect(p.btc).toBe(0.1);
    expect(p.invested).toEqual({ BRL: 5_000, USD: 1_000 });
    expect(p.averagePrice).toEqual({ BRL: 50_000, USD: 10_000 });
  });
});

describe("computePosition com estimativas e vendas", () => {
  const a1 = { id: "a1", date: day(0), amount: 5_000, currency: "BRL" as const, btc: 0.1 };
  const a2 = { id: "a2", date: day(1), amount: 2_000, currency: "USD" as const, btc: 0.1 };

  it("aporte sem quantidade estima o BTC pelo fechamento do dia", () => {
    const p = computePosition({ kind: "aportes", aportes: [{ ...a1, btc: undefined }], vendas: [] }, daily);
    expect(p.btc).toBeCloseTo(0.1, 12);
    expect(p.entries[0].btcEstimated).toBe(true);
  });

  it("aportes em reais e em dólares somam pela cotação de cada data", () => {
    const p = computePosition({ kind: "aportes", aportes: [a2, a1], vendas: [] }, daily);
    expect(p.btc).toBeCloseTo(0.2, 12);
    // R$ 5.000 + US$ 2.000 × 6 = R$ 17.000; US$ 1.000 + US$ 2.000 = US$ 3.000
    expect(p.invested.BRL).toBeCloseTo(17_000, 6);
    expect(p.invested.USD).toBeCloseTo(3_000, 6);
    expect(p.averagePrice!.BRL).toBeCloseTo(85_000, 6);
    expect(p.averagePrice!.USD).toBeCloseTo(15_000, 6);
    expect(p.entries.map((e) => e.id)).toEqual(["a1", "a2"]);
  });

  it("venda parcial reduz a quantidade sem mudar o Preço médio e gera Lucro realizado", () => {
    const venda = { id: "v", date: day(1), btc: 0.05, amount: 4_000, currency: "BRL" as const };
    const p = computePosition({ kind: "aportes", aportes: [a1], vendas: [venda] }, daily);
    expect(p.btc).toBeCloseTo(0.05, 12);
    expect(p.averagePrice!.BRL).toBeCloseTo(50_000, 6);
    expect(p.invested.BRL).toBeCloseTo(2_500, 6);
    // R$ 4.000 − 0,05 × R$ 50.000; em dólar, R$ 4.000 ÷ 6 − 0,05 × US$ 10.000
    expect(p.realized.BRL).toBeCloseTo(1_500, 6);
    expect(p.realized.USD).toBeCloseTo(4_000 / 6 - 500, 6);
  });

  it("venda sem valor recebido usa o fechamento do dia", () => {
    const venda = { id: "v", date: day(1), btc: 0.05, currency: "USD" as const };
    const p = computePosition({ kind: "aportes", aportes: [a1], vendas: [venda] }, daily);
    // 0,05 × US$ 20.000 − 0,05 × US$ 10.000
    expect(p.realized.USD).toBeCloseTo(500, 6);
  });

  it("quantidade da Binance substitui a soma dos aportes no Preço médio", () => {
    const p = computePosition({ kind: "aportes", aportes: [a1, a2], vendas: [] }, daily, 0.25);
    expect(p.btc).toBe(0.25);
    expect(p.averagePrice!.BRL).toBeCloseTo(68_000, 6);
  });
});

describe("computePosition com Total investido", () => {
  it("estima a quantidade pelo preço médio informado e converte pela cotação de hoje sem data", () => {
    const p = computePosition({ kind: "total", amount: 10_000, currency: "BRL", averagePrice: 50_000 }, daily);
    expect(p.btc).toBeCloseTo(0.2, 12);
    expect(p.invested.USD).toBeCloseTo(10_000 / 5.5, 6);
    expect(p.fxAssumedToday).toBe(true);
  });

  it("com data, estima pelo fechamento daquele dia e converte pela cotação dele", () => {
    const p = computePosition({ kind: "total", amount: 4_000, currency: "USD", date: day(1) + 3_600_000 }, daily);
    expect(p.btc).toBeCloseTo(0.2, 12);
    expect(p.invested).toEqual({ BRL: 24_000, USD: 4_000 });
    expect(p.fxAssumedToday).toBe(false);
  });

  it("com a quantidade informada, não estima nada", () => {
    const p = computePosition({ kind: "total", amount: 4_000, currency: "USD" }, daily, 0.5);
    expect(p.btc).toBe(0.5);
    expect(p.averagePrice!.USD).toBeCloseTo(8_000, 6);
    expect(p.entries[0].btcEstimated).toBe(false);
  });
});

describe("valuation", () => {
  it("calcula Patrimônio em BTC e Lucro não realizado ao preço atual", () => {
    const p = computePosition({ kind: "total", amount: 5_000, currency: "BRL", date: day(0) }, daily, 0.1);
    const v = valuation(p, { BRL: 165_000, USD: 30_000 });
    expect(v.value).toEqual({ BRL: 16_500, USD: 3_000 });
    expect(v.unrealized.BRL).toBeCloseTo(11_500, 6);
    expect(v.unrealizedPct!.USD).toBeCloseTo(2, 12);
  });

  it("sem custo informado não há percentual", () => {
    const p = computePosition({ kind: "aportes", aportes: [], vendas: [] }, daily);
    expect(valuation(p, { BRL: 1, USD: 1 }).unrealizedPct).toBeNull();
  });
});

describe("computePosition só com a quantidade", () => {
  it("Binance conectada sem custo informado: tem quantidade, mas não Preço médio", () => {
    const p = computePosition({ kind: "aportes", aportes: [], vendas: [] }, daily, 0.3);
    expect(p.btc).toBe(0.3);
    expect(p.averagePrice).toBeNull();
  });
});

describe("computePosition com venda maior que a posição", () => {
  const aporte = { id: "a", date: day(1), amount: 2_000, currency: "USD" as const, btc: 0.1 };

  it("venda antes do primeiro aporte é marcada e não gera NaN", () => {
    const venda = { id: "v", date: day(0), btc: 0.05, currency: "USD" as const };
    const p = computePosition({ kind: "aportes", aportes: [aporte], vendas: [venda] }, daily);
    expect(p.oversold).toBe(true);
    expect(Number.isNaN(p.invested.USD)).toBe(false);
    expect(Number.isNaN(p.realized.USD)).toBe(false);
  });

  it("venda de toda a posição zera o Total investido", () => {
    const venda = { id: "v", date: day(2), btc: 0.1, currency: "USD" as const };
    const p = computePosition({ kind: "aportes", aportes: [aporte], vendas: [venda] }, daily);
    expect(p.oversold).toBe(false);
    expect(p.btc).toBeCloseTo(0, 12);
    expect(p.invested.USD).toBeCloseTo(0, 6);
    expect(p.realized.USD).toBeCloseTo(1_000, 6);
  });
});
