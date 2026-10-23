import { describe, expect, it } from "vitest";
import { formatBtc, formatMoney, formatSignedMoney, formatSignedPercent } from "./format";

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

  it("zero não leva sinal", () => {
    expect(formatSignedPercent(0)).toBe("0,00%");
  });
});

describe("formatBtc", () => {
  it("usa até 8 casas decimais e remove zeros à direita", () => {
    expect(formatBtc(0.12345678)).toBe("0,12345678 BTC");
    expect(formatBtc(1.5)).toBe("1,5 BTC");
  });
});
