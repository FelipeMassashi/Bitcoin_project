import { describe, expect, it } from "vitest";
import { formatBtc, formatMoney, formatSignedMoney, formatSignedPercent, parseDecimal } from "./format";

const NBSP = " ";

describe("formatMoney", () => {
  it("formata reais no padrão brasileiro", () => {
    expect(formatMoney(1234.56, "BRL")).toBe(`R$${NBSP}1.234,56`);
  });

  it("formata dólares com prefixo US$ e separadores brasileiros", () => {
    expect(formatMoney(98765.4, "USD")).toBe(`US$${NBSP}98.765,40`);
  });
});

describe("formatSignedMoney", () => {
  it("mostra + no lucro e o sinal de menos tipográfico no prejuízo", () => {
    expect(formatSignedMoney(1500, "BRL")).toBe(`+R$${NBSP}1.500,00`);
    expect(formatSignedMoney(-1500, "BRL")).toBe(`−R$${NBSP}1.500,00`);
  });
});

describe("formatSignedPercent", () => {
  it("recebe fração e mostra percentual com duas casas e sinal", () => {
    expect(formatSignedPercent(0.1234)).toBe("+12,34%");
    expect(formatSignedPercent(-0.05)).toBe("−5,00%");
  });

  it("zero não leva sinal, nem quando o valor só arredonda para zero", () => {
    expect(formatSignedPercent(0)).toBe("0,00%");
    expect(formatSignedPercent(-0.004, 0)).toBe("0%");
  });

  it("aceita menos casas decimais", () => {
    expect(formatSignedPercent(0.4801, 0)).toBe("+48%");
  });
});

describe("formatBtc", () => {
  it("usa até 8 casas decimais e remove zeros à direita", () => {
    expect(formatBtc(0.12345678)).toBe("0,12345678 BTC");
    expect(formatBtc(1.5)).toBe("1,5 BTC");
  });
});

describe("parseDecimal", () => {
  it("entende valores digitados no padrão brasileiro", () => {
    expect(parseDecimal("10.000,50", "money")).toBe(10000.5);
    expect(parseDecimal("R$ 1.234", "money")).toBe(1234);
    expect(parseDecimal("1234,5", "money")).toBe(1234.5);
  });

  it("em quantidade de bitcoin, ponto sozinho é casa decimal", () => {
    expect(parseDecimal("0.05", "btc")).toBe(0.05);
    expect(parseDecimal("0,0012", "btc")).toBe(0.0012);
  });

  it("devolve null para texto vazio ou inválido", () => {
    expect(parseDecimal("", "money")).toBeNull();
    expect(parseDecimal("abc", "btc")).toBeNull();
    expect(parseDecimal("1,2,3", "money")).toBeNull();
  });
});
