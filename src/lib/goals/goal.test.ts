import { describe, expect, it } from "vitest";
import { afterNewAporte, amountForProfit, requiredRise, targetPrice } from "./goal";

describe("Preço-alvo e Alta necessária", () => {
  it("Preço-alvo é o Preço médio mais a Meta", () => {
    expect(targetPrice(200_000, 0.25)).toBe(250_000);
  });

  it("Alta necessária parte do preço de hoje, não do Preço médio", () => {
    expect(requiredRise(250_000, 200_000)).toBeCloseTo(0.25, 12);
    expect(requiredRise(250_000, 125_000)).toBeCloseTo(1, 12);
    // já acima do alvo: alta negativa
    expect(requiredRise(250_000, 300_000)).toBeCloseTo(-1 / 6, 12);
  });
});

describe("amountForProfit", () => {
  it("para lucrar R$ 10.000 com alta de 25%, é preciso aportar R$ 40.000 hoje", () => {
    expect(amountForProfit(10_000, 0.25)).toBeCloseTo(40_000, 9);
  });
});

describe("afterNewAporte", () => {
  it("comprar abaixo do Preço médio puxa o Preço médio e o Preço-alvo para baixo", () => {
    // 0,1 BTC por R$ 30.000 (médio R$ 300.000); novo aporte de R$ 20.000 a R$ 200.000 = 0,1 BTC
    const r = afterNewAporte({ btc: 0.1, invested: 30_000 }, { amount: 20_000, price: 200_000 }, 0.25);
    expect(r.btc).toBeCloseTo(0.2, 12);
    expect(r.averagePrice).toBeCloseTo(250_000, 6);
    expect(r.targetPrice).toBeCloseTo(312_500, 6);
    expect(r.requiredRise).toBeCloseTo(312_500 / 200_000 - 1, 12);
  });

  it("sem posição, o novo Preço médio é o preço de hoje", () => {
    const r = afterNewAporte({ btc: 0, invested: 0 }, { amount: 1_000, price: 400_000 }, 0.5);
    expect(r.averagePrice).toBeCloseTo(400_000, 6);
    expect(r.requiredRise).toBeCloseTo(0.5, 12);
  });
});
